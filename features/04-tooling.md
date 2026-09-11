# Spec 04 — Tooling

Project infrastructure rather than application code. T1 is the one that changes how every
other spec in this folder gets verified, so it is worth doing first even though nothing in
the running API depends on it.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.

---

## T1 — No tests

**Severity:** high — the largest structural gap in the project.

**Problem**
There is no test runner, and no tests. Every change is verified by hand against a live
MongoDB, which means the per-user ownership guards — the logic that decides whether one
user can read another user's contacts — have never been mechanically checked. Those guards
are exactly what a test suite exists to protect: easy to break in a refactor, silent when
broken, and security-relevant when they fail.

Several other specs here also change behaviour in ways that are hard to eyeball. D2 in
particular rewrites the ownership check into a single filter key, and should not land
without tests covering it first.

**Fix**
Node 18+ ships `node:test`, so the runner needs no dependency. Add two devDependencies:

- `supertest` — drives the Express app over HTTP without binding a port.
- `mongodb-memory-server` — a real MongoDB per test run, no fixture cleanup, no shared dev
  database.

This requires one change to application code: [server.js](../server.js) currently builds
the app and calls `app.listen` in the same file, so requiring it starts a server. Split it
— `app.js` exports the configured app, `server.js` requires it and listens. Tests import
`app.js`.

Add to [package.json](../package.json):

```json
"test": "node --test"
```

Cover first, in this order:
1. **Ownership** — user A cannot read, update, or delete user B's contact.
2. **Auth middleware** — missing token, malformed token, expired token.
3. **Validation** — each route's required fields.
4. **Registration and login** — duplicate email, wrong password, successful token issue.

**Acceptance criteria**
- `npm test` passes from a clean checkout with no MongoDB running locally.
- A deliberately broken ownership check fails the suite.
- Tests share no state; any test can run alone.

---

## T2 — `concurrently` is an unused dependency

**Severity:** low.

**Problem**
`concurrently` sits in devDependencies to run an API and client together. There is no
client — no `client/` directory, and no script referencing it. It is listed in
[CLAUDE.md](../CLAUDE.md) as existing "for a client app that does not exist yet".

**Fix**
Remove it. It is one `npm install` away when the client actually lands, and an unused
dependency is a supply-chain surface and a false signal about the project's shape.

If a client is genuinely imminent, the alternative is to keep it and add the `dev` script
it exists for, so the dependency is at least honest:

```json
"dev": "concurrently \"npm run server\" \"npm run client\""
```

Do one or the other. Leaving it unreferenced is the only wrong answer.

**Acceptance criteria**
- Every devDependency is referenced by a script or a config file.
- `npm run server` and `npm start` are unaffected.

---

## T3 — `Contact.user` references a model name that does not exist

**Severity:** low today, guaranteed breakage later.

**Problem**
[models/Contact.js](../models/Contact.js) declares `ref: 'users'`, but
[models/User.js](../models/User.js) registers the model as `'user'`. Mongoose resolves
`ref` lazily, at populate time — so nothing fails today, because nothing calls
`.populate('user')`. The first call that does will throw
`MissingSchemaError: Schema hasn't been registered for model "users"`, at runtime, in
whatever feature introduced it.

A latent error that only surfaces in unrelated future work is worth spending two characters
to remove now.

**Fix**
Change `ref: 'users'` to `ref: 'user'` in `models/Contact.js` — fix the reference, not the
model name, since `mongoose.model('user', ...)` is what the rest of the code and the
existing collection depend on.

**Acceptance criteria**
- `Contact.findOne().populate('user')` resolves and returns the linked user.
- The underlying collection name is unchanged, so existing data is untouched.

---

## T4 — `config/db.js` hardcodes the database name

**Severity:** low — a deployment foot-gun.

**Problem**
[config/db.js](../config/db.js) connects with `{ dbName: 'dev-db' }`, which overrides
whatever database segment is in `MONGO_URI`. [.env.example](../.env.example) documents the
opposite, telling the reader that the path segment after the host selects the database.

The consequence is that deploying to production with a correct production URI silently
writes to `dev-db` on the production cluster. Configuration appears to be respected and is
not — the worst failure mode for a config bug, because nothing errors.

**Fix**
Drop the `dbName` override and let the URI decide, which is what the example file already
promises:

```js
mongoose.connect(db)
```

Keeping a default is reasonable, but it must be overridable —
`{ dbName: process.env.DB_NAME }` is undefined-safe and falls back to the URI segment when
unset. A bare literal is not.

Either way, the comment in `.env.example` and the code must agree. They currently
contradict each other, which is how this survived.

**Acceptance criteria**
- A `MONGO_URI` ending in `/contact-keeper` connects to `contact-keeper`.
- The startup log line, which already prints `conn.connection.name`, shows the database
  the URI asked for.
- `.env.example` matches the implemented behaviour.

---

## T5 — No linter or formatter

**Severity:** low — deliberate today, worth revisiting.

**Problem**
No ESLint, no Prettier. The style rules in [CLAUDE.md](../CLAUDE.md) — no semicolons,
single quotes, 2-space indent, trailing commas, arrow functions — are enforced by reading
the surrounding file and matching it. That holds for one developer and stops holding at
two, or at the first contribution from an editor configured differently.

There is already a stray `// eslint-disable-next-line no-unused-vars` in
[middleware/errorHandler.js](../middleware/errorHandler.js) suppressing a rule no
configured linter will ever run.

**Fix**
Note that `CLAUDE.md` states "No Prettier config — match surrounding files" as a
convention, so this is a change of position rather than a defect to repair. Raise it before
implementing.

If adopted: a Prettier config encoding the existing rules (`semi: false`, `singleQuote:
true`, `tabWidth: 2`, `trailingComma: 'all'`), plus ESLint with `eslint:recommended` for
the actual bug-catching. Format the whole tree in a single commit that changes nothing
else, so the noise never mixes with a real diff. Then either drop the stale eslint-disable
comment or keep it as the one legitimate suppression it was written to be.

**Acceptance criteria**
- `npm run lint` and `npm run format` exist and pass on a clean tree.
- Running the formatter over the current code produces no diff — the config matches the
  code as written, rather than restyling it.
- `CLAUDE.md` is updated to point at the config instead of "match surrounding files".
