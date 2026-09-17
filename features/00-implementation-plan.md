# Implementation Plan

Specs 01–07 list 44 items. Most of them should not be done soon, and some should never be
done. This is the order to work in and, more usefully, where to stop.

The sequence is driven by **dependencies and breaking-change windows**, not by severity. A
few high-severity items sit late because doing them early means doing them twice.

Effort figures are rough and assume familiarity with the codebase.

---

## The short answer

If you do nothing else, do **Phase 0 and Phase 1** — roughly one day, and it removes most
of the risk in the project. Phase 4 was the one with a deadline, and that deadline has passed:
the React client in `client/` now calls every endpoint using today's shapes. Phase 4 is still
worth doing, but each item now needs a client edit too (listed in the phase), and the list
grows with every API call the client adds.

| Phase | What | Effort | Skippable? |
|---|---|---|---|
| 0 | One-line fixes | ~1h | No |
| 1 | Test harness + shutdown | ~half day | No |
| 2 | Correctness bugs | ~half day | No |
| 3 | Security baseline | ~2h | Not if deployed |
| 4 | **Breaking changes — server and client together** | ~1 day, plus client edits | No, and it gets more expensive as the client grows |
| 5 | Query layer | ~1 day | Yes, until data grows |
| 6 | Refresh tokens | ~2–3 days | Yes, if hourly logout is tolerable |
| 7 | Operability | ~1 day | Only if deployed |
| 8 | Product features | open-ended | Entirely optional |

**Stop after Phase 4** if this is a portfolio or learning project. Everything from Phase 5
on is justified by real users or real data volume, and building it without either is
speculative.

---

## Phase 0 — One-line fixes

**~1 hour. One commit. No risk.**

Five items, each a line or two, that currently cost more in confusion than they do to fix.
`C1` genuinely blocks a fresh clone from booting, so it comes before everything including
the test harness.

- [ ] **C1** — uncomment `JWT_SECRET` in `.env.example` ([Spec 01](01-correctness-bugs.md))
- [ ] **T4** — drop the hardcoded `dbName: 'dev-db'` ([Spec 04](04-tooling.md))
- [ ] **T3** — `ref: 'users'` → `ref: 'user'` ([Spec 04](04-tooling.md))
- [x] **T2** — `concurrently` resolved the other way: kept, and wired to `npm run dev` when
      the client was scaffolded ([Spec 04](04-tooling.md))
- [ ] **D6** — `express.json({ extended: false })` → `express.json()` ([Spec 03](03-design-and-performance.md))

T4 is the one that matters beyond tidiness: until it is fixed, a correct production
`MONGO_URI` silently writes to `dev-db`.

---

## Phase 1 — Safety net

**~half a day. Everything after this is safer because of it.**

- [ ] Split `app.js` (exports the configured app) from `server.js` (requires it, listens)
- [ ] **T1** — test harness: `node:test` + `supertest` + `mongodb-memory-server` ([Spec 04](04-tooling.md))
- [ ] **P1** — graceful shutdown on SIGTERM/SIGINT ([Spec 07](07-api-platform.md))

The split is a prerequisite for T1 (tests must import the app without binding a port) and
the natural home for P1's signal handlers. One refactor, two payoffs — do all three
together.

**The pitfall.** Write tests for behaviour that is correct and must stay correct:
ownership guards, auth rejection, token issuance. Do **not** write tests for the buggy
behaviour Phase 2 is about to change — you would assert that PUT requires a name, then
delete that test two hours later. Buggy paths get their tests as part of their fix.

Put the auth header in a single test helper. Phase 4 changes that header, and you want it
to be a one-line change in the suite.

---

## Phase 2 — Correctness bugs

**~half a day. Phase 1's tests catch anything you knock loose.**

- [ ] **C7** — `require:` → `required:` in both models
- [ ] **C2** — malformed `:id` returns 400, not 500
- [ ] **C3** + **S4** — PUT partial updates, and `auth` before validation
- [ ] **C4** — lowercase email
- [ ] **C5** — explicit field destructuring in `addContact`
- [ ] **C6** — duplicate-registration race returns 400

C3 and S4 edit the same lines in [routes/contacts.js](../routes/contacts.js). Land them in
one commit.

C7 first in this phase: turning on schema validation may surface assumptions the other
fixes depend on, and it is better to find that before the rest of the work is stacked on
top.

---

## Phase 3 — Security baseline

**~2 hours. Do before the first deploy, skip while purely local.**

- [ ] **S1** — rate limit `/api/auth` and `/api/users` ([Spec 02](02-security-hardening.md))
- [ ] **S2** — `helmet` and `cors`. The dev-proxy half is done: `client/vite.config.js`
      proxies `/api`, and the dead root `proxy` field is gone
- [ ] **S3** — constant-time login path

S1 is the highest-value security item in all seven specs: login is an unthrottled bcrypt
endpoint, which is both a credential-stuffing surface and a CPU-exhaustion vector.

S3 after S1, deliberately — rate limiting is what makes timing attacks impractical, so the
cheap fix does most of the work before the fiddly one.

---

## Phase 4 — Breaking changes

**~1 day, plus client edits. This phase gets more expensive as the client grows.**

- [ ] **A1** — `Authorization: Bearer`, and flatten the JWT payload to `sub` ([Spec 05](05-auth-features.md))
- [ ] **P5** — mount everything under `/api/v1/` ([Spec 07](07-api-platform.md))
- [ ] **P7** — one response envelope with machine-readable error codes
- [ ] **D2** — single-query ownership guard, 401 collapsed into 404 ([Spec 03](03-design-and-performance.md))

Every item here changes an existing contract. That was free while nothing consumed the API.
It no longer is. The React client in `client/` now calls every endpoint using today's
`x-auth-token` header, unversioned `/api/...` paths, and mixed response shapes. P5 exists
precisely to make later breaks cheap, so postponing it defeats its purpose.

The cost is still bounded, because the client lives in this repo and ships with the API.
There is no outside consumer to migrate, so skip the dual-read and deprecation steps the specs
describe for that case. Change the server and the client in the same commit:

| Item | Client edit |
|---|---|
| A1 | [client/utils/setAuthToken.js](../client/utils/setAuthToken.js): send `Authorization: Bearer <token>` instead of `x-auth-token`. It is the only place the client names the header. |
| P5 | The seven `/api/...` call sites in [AuthState.jsx](../client/context/auth/AuthState.jsx) and [ContactState.jsx](../client/context/contact/ContactState.jsx). Set `axios.defaults.baseURL` once so the next bump is one line. The Vite proxy matches the `/api` prefix, so it keeps working unchanged. |
| P7 | The `data?.errors?.[0]?.msg ?? data?.msg` fallback, repeated in all seven failure handlers, and every `res.data` read. Replace the fallback with one shared reader of the new error shape. |
| D2 | None. The client shows the message and never branches on 401 vs 404. |

Every API call the client adds before this phase lands makes this table longer.

Order within the phase: **A1 → P5 → P7 → D2**. A1 touches every controller's `req.user`
access; doing it before P7 rewrites those same response lines avoids editing them twice.

Two notes:

- Design P7's envelope so Phase 5's pagination metadata fits inside it. Otherwise F3
  breaks the list response a second time.
- D2 replaces the three-step ownership guard that [CLAUDE.md](../CLAUDE.md) documents as
  the pattern to repeat. Update that section in the same commit, or the docs and the code
  diverge immediately.

**Update `CLAUDE.md` and `README.md` at the end of this phase** — the auth header, the
route prefix, the response shape, the ownership pattern, and the client's error fallback are
all described there and will all be wrong.

---

## Phase 5 — Query layer

**~1 day. Justified by data volume, not by principle.**

- [ ] **D1** — compound index `{ user: 1, date: -1 }`
- [ ] **F1** — `GET /api/contacts/:id` ([Spec 06](06-contacts-features.md))
- [ ] **D3** — JSON 404 handler for unmatched routes
- [ ] **D4** — `type` enum
- [ ] **F2** — search and filter
- [ ] **F3** — pagination and sorting. Breaks the list response the client reads in
      `getContacts`, so change that in the same commit

D1 first: F2 and F3 both lean on it, and adding the index afterwards means measuring the
same queries twice.

F1 is ten lines and closes a real hole — there is currently no way to fetch one contact.
Worth doing even if the rest of this phase waits.

---

## Phase 6 — Refresh tokens

**~2–3 days. The largest single piece of work in the specs.**

- [ ] **A2** — access/refresh split, rotation, reuse detection
- [ ] **A3** — logout and logout-all
- [ ] **A4** — change password

Resolves **D5**, deferred in [Spec 03](03-design-and-performance.md).

Defer this phase honestly. Until it lands, the interim answer is a longer access-token
expiry with a comment saying why — a few characters of work that accepts, out loud, that
revocation is not possible yet. That is a reasonable position for a project with no users.
An undocumented `expiresIn: 3600` is not.

A2 changes the client too. The client keeps its one token in `localStorage`, where any
script on the page can read it. A2's design keeps the access token in memory and the refresh
token in an httpOnly cookie, and whether that cookie works depends on how the client and API
are deployed, which is not decided yet.

A3 is nearly free once A2 exists and impossible before it. A4 is independently useful and
can be done early if a password change is needed sooner, minus its session-revocation half.

---

## Phase 7 — Operability

**~1 day. Only meaningful once deployed.**

- [ ] **P2** — `/health` with database status
- [ ] **P3** — structured logging with request ids and redaction
- [ ] **P4** — OpenAPI spec at `/api-docs`

P2 and P3 are what make production debuggable at all. P4 is worth more after Phase 4: with
bearer auth, Swagger UI's Authorize button works natively.

On P3, configure redaction at setup time, not later. The window between "logging added" and
"redaction configured" is how plaintext passwords end up in permanent storage.

---

## Phase 8 — Product features

**Open-ended. Pick by what users ask for.**

Rough value-to-effort order:

- [ ] **F6** — favourites (trivial, immediately useful)
- [ ] **P6** — compression (one line; skip if a reverse proxy already does it)
- [ ] **F5** — CSV import/export (the feature that makes the app adoptable)
- [ ] **F8** — bulk operations
- [ ] **F7** — soft delete (touches every query — more invasive than it looks)
- [ ] **A5** + **A6** — password reset and email verification (shared email provider; pick once)
- [ ] **F4** — richer contact model (schema migration)
- [ ] **T5** — linter and formatter — **needs your decision first**, it contradicts a stated
      convention in `CLAUDE.md`

Not recommended, with reasoning in [Spec 05](05-auth-features.md): OAuth, 2FA, and RBAC.
All three are real features solving problems this project does not have yet.

---

## Dependencies at a glance

```
C1 ─────────────────────────────► everything (fresh clone must boot)
app/server split ──┬─► T1 (tests)
                   └─► P1 (graceful shutdown)
T1 ────────────────► Phases 2–8 (regression safety)
A1 ────────────────┬─► A2 ─► A3
                   └─► P4 (usable Swagger auth)
P7 ────────────────► F3 (envelope must fit pagination metadata)
A1, P5, P7, F3 ────► matching client edits, in the same commit
D1 ────────────────► F2, F3
A2 ────────────────► A3, A7, and the revocation half of A4, A5
email provider ────► A5, A6
D2 ────────────────► CLAUDE.md ownership section
```
