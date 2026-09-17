# Spec 02 — Security Hardening

Gaps that are not bugs in the sense of "wrong output", but leave the API exposed. S1 is
the one that matters most; the rest are cheap and worth doing in the same pass.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.

---

## S1 — No rate limiting on the auth endpoints

**Severity:** high — the single largest gap in the project.

**Problem**
`POST /api/auth` (login) and `POST /api/users` (register) are unthrottled and both run
bcrypt at salt round 10. That is two problems in one endpoint:

- **Credential stuffing.** Nothing slows an attacker down. Passwords have a 6-character
  minimum ([routes/users.js](../routes/users.js)), so the search space is small.
- **CPU exhaustion.** Each login costs ~100ms of deliberately expensive hashing. A trivial
  volume of concurrent requests saturates the event loop and takes the whole API down —
  an attacker does not need a valid account, only the login endpoint.

**Fix**
Add `express-rate-limit` and apply a strict limiter to the two public auth routes
specifically, not globally — contacts CRUD should not share a login budget.

```js
const rateLimit = require('express-rate-limit')

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { msg: 'Too many attempts, please try again later' },
})
```

Mount it in [routes/auth.js](../routes/auth.js) and [routes/users.js](../routes/users.js)
ahead of the validation chain, so rejected requests cost nothing.

Note for later: the limiter keys on client IP, so it needs `app.set('trust proxy', 1)` in
[server.js](../server.js) once this runs behind a load balancer or it will bucket every
request together.

**Acceptance criteria**
- The 11th login attempt from one IP inside 15 minutes returns 429 with a JSON body.
- A rate-limited request never reaches bcrypt.
- `GET /api/contacts` is unaffected by login traffic.

---

## S2 — Missing `helmet` and `cors`

**Severity:** medium — `cors` becomes blocking as soon as the client and API are served from
different origins.

**Status:** half done. The dev proxy is in place; `helmet` and `cors` are not.

**Problem**
[server.js](../server.js) mounts only `express.json`. It sets no security response headers
and has no CORS policy. The React client in `client/` calls the API, and in development that
works only because the Vite dev server proxies `/api` to Express, which makes every request
same-origin. A build served from a different origin than the API will fail on the
same-origin policy.

The proxy half was fixed alongside the client's first API calls. The dead Create React App
`"proxy"` field is gone from the root [package.json](../package.json), and
[client/vite.config.js](../client/vite.config.js) now has:

```js
server: { proxy: { '/api': 'http://localhost:5000' } },
```

**Fix**
Add both as the first middleware in `server.js`, before the body parser:

```js
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
```

The proxy and `cors` do not replace each other. With the proxy, development requests are same-origin
and never exercise CORS. `cors` is still needed wherever the client and API are deployed on
different origins, so test CORS with the proxy off.

Read the allowed origin from the environment rather than hardcoding it, and add
`CLIENT_URL` to [.env.example](../.env.example). Do **not** add it to the required list in
[config/env.js](../config/env.js) — it needs a working default, unlike `MONGO_URI` and
`JWT_SECRET`.

Because `auth` reads a custom `x-auth-token` header rather than `Authorization`, that
header must be named in the CORS config or browser preflight will strip it. This is easy
to miss and fails only in the browser, never in Postman.

**Acceptance criteria**
- Responses carry helmet's default headers.
- A cross-origin request from `CLIENT_URL` carrying `x-auth-token` completes, preflight
  included.
- An unlisted origin is rejected.
- **Done:** the root `package.json` no longer has a `proxy` field, and with `npm run dev` a
  relative `/api/...` request from the client reaches Express.

---

## S3 — User enumeration via response timing

**Severity:** low — real, but only exploitable with careful measurement.

**Problem**
[controllers/authController.js](../controllers/authController.js) returns immediately when
`findOne` yields no user, skipping the bcrypt comparison entirely. A wrong password costs
~100ms; an unregistered address costs ~1ms. The response bodies are identically
`Invalid credentials` — which is correct and deliberate — but the timing discloses exactly
what the message set out to hide.

**Fix**
Spend the same work on both paths. Compare against a precomputed dummy hash when the user
is absent, then fall through to the shared failure response:

```js
const DUMMY_HASH = '$2a$10$' + '.'.repeat(53) // replace with a real bcrypt hash
const isMatch = user
  ? await bcrypt.compare(password, user.password)
  : await bcrypt.compare(password, DUMMY_HASH)
```

Generate the constant once with a real `bcrypt.hash` call and paste the literal in — a
malformed hash makes `compare` return early and reintroduces the gap.

Order this after S1. Rate limiting caps how many samples an attacker can collect, which is
what makes a timing attack impractical in the first place.

**Acceptance criteria**
- Login response time for an unknown address is within noise of a known address with a
  wrong password.
- Both still return 400 `Invalid credentials`.

---

## S4 — Validation runs before auth on POST and PUT

**Severity:** low — information disclosure, wrong status codes.

**Problem**
[routes/contacts.js](../routes/contacts.js) is inconsistent. GET and DELETE run `auth`
alone. POST and PUT run `[regCheck, validate]` *before* `auth`:

```js
router.post('/', [regCheck, validate], auth, addContact)
router.put('/:id', [regCheck, validate], auth, updateContact)
```

Express runs handlers in array order, so an unauthenticated request with a bad body gets
400 and a full description of the validation rules instead of 401. An anonymous caller can
map the request schema of a private endpoint by sending junk.

**Fix**
Put `auth` first on every private route, so authentication always gates validation:

```js
router.post('/', auth, regCheck, validate, addContact)
router.put('/:id', auth, updateCheck, validate, updateContact)
```

Use flat arguments rather than a nested array — the `[regCheck, validate]` array adds
nothing and is what made the ordering easy to misread. Note that PUT's chain changes to
`updateCheck` under [Spec 01 / C3](01-correctness-bugs.md); these two edits touch the same
lines, so land them together.

The rule to carry forward, worth adding to [CLAUDE.md](../CLAUDE.md): on a private route,
`auth` comes first, always.

**Acceptance criteria**
- An unauthenticated POST with an invalid body returns 401, not 400.
- An authenticated POST with an invalid body still returns 400 with field errors.
- All four contacts routes list their middleware in the same order.
