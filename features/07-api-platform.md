# Spec 07 — API Platform

Capabilities of the API as a service rather than features of any resource. Most are small;
P1 and P2 are what make the difference between something that runs locally and something
that can be deployed and operated.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.

---

## P1 — Graceful shutdown

**Value:** high. **Effort:** low. **The highest value-to-effort item in this spec.**

**What**
Handle `SIGTERM` and `SIGINT`: stop accepting connections, finish in-flight requests, close
the Mongoose connection, then exit.

**Why**
[server.js](../server.js) calls `app.listen` and nothing else. On deploy, a container
orchestrator sends SIGTERM and the process dies instantly — every in-flight request is
dropped, and any half-finished write is abandoned mid-operation. Every deploy silently
errors for whoever was mid-request. Locally this is invisible; in production it is every
release.

**Design**

```js
const server = app.listen(PORT, () => console.log(`Server started on port ${PORT}`))

const shutdown = async () => {
  server.close(async () => {
    await mongoose.connection.close()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

Add a timeout that force-exits after ~10 seconds. A hung request must not block the
shutdown indefinitely — the orchestrator will SIGKILL anyway, and doing it deliberately is
cleaner than being killed.

Note the interaction with [Spec 04 / T1](04-tooling.md): splitting `app.js` from
`server.js` for testability puts the listen call in one obvious place, which is exactly
where this belongs. Do them together.

**Acceptance criteria**
- SIGTERM completes in-flight requests before exiting.
- New connections are refused immediately on signal.
- The Mongoose connection closes cleanly.
- A hung request cannot prevent exit beyond the timeout.

---

## P2 — Health check endpoint

**Value:** high. **Effort:** trivial.

**What**
`GET /health` reporting process and database status.

**Why**
Every deployment target — container orchestrator, load balancer, uptime monitor — needs a
cheap endpoint to decide whether this instance should receive traffic. Without one the
answer defaults to "is the port open", which is true for a process that has completely lost
its database connection.

The existing `GET /` returns a welcome message and is not a substitute: it reports nothing
about whether the app can actually serve a request.

**Design**
Report `mongoose.connection.readyState` rather than issuing a query, so the check stays
cheap enough to poll every few seconds. Return 503, not 200, when the database is
disconnected — the status code is the part a load balancer reads.

Two endpoints is the fuller pattern: liveness (is the process alive — restart if not) and
readiness (can it serve traffic — route around if not). One endpoint is fine to start.

Keep it unauthenticated but leak nothing: no version strings, no connection strings, no
stack traces. Exempt it from rate limiting, or the monitor will trip its own limiter.

**Acceptance criteria**
- Returns 200 with database status when healthy.
- Returns 503 when the database is disconnected.
- Requires no authentication and exposes no internal detail.
- Not rate limited.

---

## P3 — Request logging

**Value:** high for operability. **Effort:** low.

**What**
Structured request logging — method, path, status, duration, request id.

**Why**
The only output today is `console.error(err.stack)` in
[middleware/errorHandler.js](../middleware/errorHandler.js). There is no record of what
was requested, by whom, or how long it took. When something misbehaves in production there
is nothing to look at, and a stack trace with no surrounding request context is often not
enough to reproduce.

**Design**
`pino` over `morgan` — JSON output that a log aggregator can query, and fast enough not to
matter. `morgan` is fine if logs are only ever read by eye.

Attach a request id to every entry and return it in an error response. When a user reports
a failure, that id is what turns an unreproducible report into a specific log line.

**Redaction is the part to get right.** Never log `Authorization` headers, `x-auth-token`,
`password` fields, or reset tokens. Configure redaction paths at setup — the moment logging
is added, request bodies are one careless config line away from putting plaintext passwords
in permanent storage.

Reduce verbosity in test runs or the suite from T1 becomes unreadable.

**Acceptance criteria**
- Every request logs method, path, status, and duration.
- Every log line carries a request id, and errors return it to the client.
- No credential, token, or password appears in any log line.
- Log level is configurable by environment.

---

## P4 — OpenAPI documentation

**Value:** medium-high. **Effort:** medium.

**What**
An OpenAPI 3 spec, served interactively at `/api-docs`.

**Why**
[README.md](../README.md) is the only description of the API, and it will drift from the
routes the first time anyone is in a hurry. A served spec gives a browsable, executable
reference and a contract clients can generate from.

**Design**
The choice that determines whether this survives: hand-written spec file, or JSDoc
annotations on the routes. A separate file is cleaner to read and *will* go stale.
Annotations sit next to the code they describe and are more likely to be updated with it.
Prefer annotations for that reason alone.

The bearer migration in [Spec 05 / A1](05-auth-features.md) matters here — Swagger UI's
"Authorize" button understands `bearerAuth` natively, while `x-auth-token` requires manual
header entry on every call. Doing A1 first makes these docs genuinely usable.

Do not serve the interactive UI publicly in production without thought; it is a complete map
of the attack surface.

**Acceptance criteria**
- Every route, including error responses, is documented.
- The UI can authenticate and execute a real request.
- The spec validates against the OpenAPI 3 schema.
- Adding a route without documenting it is visible in review.

---

## P5 — API versioning

**Value:** medium. **Effort:** low now, high later. **Decide before the first client ships.**

**What**
Mount routes under `/api/v1/`.

**Why**
Routes are mounted at `/api/auth`, `/api/users`, `/api/contacts` in
[server.js](../server.js) with no version segment. Several planned changes are breaking —
the bearer header (A1), the paginated response envelope (F3), the collapsed 401→404 in D2.
With no version namespace, every one of those forces a lockstep client deploy.

This is cheap now and expensive once a client consumes the API, which is the entire
argument for doing it first. The React client in `client/` exists but makes no API calls
yet, so the window is still open.

**Design**
A URL segment is the least clever option and the easiest to debug — a header-based scheme
is invisible in a browser, a log line, or a curl command someone pastes into chat.

Versioning is not free: it is a promise to keep old versions running. Decide the deprecation
policy at the same time, or v1 lives forever by default.

**Acceptance criteria**
- All routes are served under `/api/v1/`.
- Adding v2 later requires no change to v1 handlers.
- The version appears in docs and logs.

---

## P6 — Response compression

**Value:** low-medium. **Effort:** trivial.

**What**
`app.use(compression())`.

**Why**
JSON compresses extremely well. A list of several hundred contacts is mostly repeated key
names — typically a 70–80% reduction for one line of code.

**Design**
Mount before the routes. Skip it if a reverse proxy already compresses, since doing it twice
wastes CPU for no benefit — check before adding.

Largest gain on the list endpoint, which is also the one F3 is about to paginate. Do F3
first; a properly paginated endpoint needs this less.

**Acceptance criteria**
- Responses are gzipped when the client advertises support.
- Small responses are not compressed (below the default threshold).

---

## P7 — Consistent response envelope

**Value:** medium. **Effort:** low, but touches every controller.

**What**
One response shape across the API.

**Why**
There are currently three conventions in play: bare objects (`res.json(user)`), bare arrays
(`res.json(contacts)`), and `{ msg }` for both errors and success confirmations. Validation
failures return `{ errors: [...] }` from
[middleware/validate.js](../middleware/validate.js) while everything else returns `{ msg }`.
A client must special-case each endpoint, and cannot write one error handler.

**Design**
Pick a shape and apply it everywhere — success carrying a `data` key, errors carrying a
consistent `error` object with a machine-readable code. Codes matter more than messages: a
client should branch on `INVALID_CREDENTIALS`, not on matching the string
`'Invalid credentials'`.

This is breaking for every endpoint at once, which is the argument for doing it now while
no client consumes the API — and the argument for doing it alongside P5, so the change lands as v1's
shape rather than as a break.

F3 changes the list response shape anyway. Sequence these together rather than breaking the
same endpoint twice.

**Acceptance criteria**
- Every endpoint, success and error alike, returns the agreed shape.
- Every error carries a stable machine-readable code.
- One client-side handler can process any error response.
- The shape is documented in P4's spec.
