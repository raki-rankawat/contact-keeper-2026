# Spec 03 — Design & Performance

Nothing here is broken. These are the places where the current shape will not hold up —
under data volume, under a real client, or under a second developer reading the code.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.

---

## D1 — No index on `Contact.user`

**Severity:** medium — degrades quietly and continuously as data grows.

**Problem**
`getContacts` in [controllers/contactsController.js](../controllers/contactsController.js)
runs `Contact.find({ user: req.user.id }).sort({ date: -1 })`. No index in
[models/Contact.js](../models/Contact.js) covers it, so MongoDB scans the entire contacts
collection — every user's rows — then sorts the matches in memory. The in-memory sort is
the sharper edge: it is capped at 32MB and aborts the query outright once exceeded.

This is invisible in development with a handful of documents and unavoidable in production.

**Fix**
Add a compound index matching the query and sort exactly:

```js
ContactSchema.index({ user: 1, date: -1 })
```

Field order matters — equality first, then sort — and gets both the filter and the sort
from the one index.

Mongoose builds indexes automatically on connect via `autoIndex`, which is convenient here
and should be disabled if this ever runs against a large production collection, where an
unexpected build can block writes.

**Acceptance criteria**
- `explain()` on the `getContacts` query reports an `IXSCAN` and no in-memory `SORT` stage.

---

## D2 — The ownership guard costs two queries and leaks existence

**Severity:** medium — the security half is the real reason to do this.

**Problem**
`updateContact` and `deleteContact` in
[controllers/contactsController.js](../controllers/contactsController.js) both follow the
same three steps: `findById`, 404 if absent, compare `contact.user.toString()` against
`req.user.id`, 401 if different — then a second query to actually write. Two round-trips
per mutation.

The distinct status codes are also an existence oracle: 404 means no such contact, 401
means the contact exists and belongs to someone else. An attacker walking ObjectIds learns
which ids are real.

**Fix**
Scope the write by owner and let the database enforce ownership in one atomic operation:

```js
const contact = await Contact.findOneAndUpdate(
  { _id: req.params.id, user: req.user.id },
  { $set: contactFields },
  { new: true },
)

if (!contact) {
  return res.status(404).json({ msg: 'No contact found' })
}
```

`findOneAndDelete` mirrors this for delete.

**Tradeoff — read before implementing.** This deliberately collapses 401 into 404, which
is what closes the leak, and it replaces the fixed three-step guard that
[CLAUDE.md](../CLAUDE.md) documents as the pattern to repeat on every new per-contact
route. That is a real cost: the current guard is explicit and obvious to a newcomer,
whereas the ownership check here is a single easily-dropped key in a filter object. If this
lands, update the ownership section of `CLAUDE.md` in the same commit so the documented
pattern and the code do not drift.

**Acceptance criteria**
- Updating or deleting another user's contact returns 404, indistinguishable from a
  non-existent id.
- Each mutation issues one database operation.
- `CLAUDE.md` describes the new pattern.

---

## D3 — No 404 handler for unmatched routes

**Severity:** low — breaks the JSON contract at the edges.

**Problem**
[server.js](../server.js) mounts three routers and the error handler. A request to an
unknown path falls through to Express's default handler, which returns an HTML error page.
Every other response in the API is JSON, so a client's `res.json()` throws on a simple URL
typo instead of reporting a clean 404.

**Fix**
Add a catch-all immediately before `app.use(errorHandler)` — the error handler must stay
last:

```js
app.use((req, res) => res.status(404).json({ msg: 'Route not found' }))
```

**Acceptance criteria**
- `GET /api/nope` returns 404 with a JSON body.
- `errorHandler` remains the final `app.use`.

---

## D4 — `type` is an unconstrained string

**Severity:** low — data quality.

**Problem**
`type` in [models/Contact.js](../models/Contact.js) is a plain `String` defaulting to
`'personal'`, and no route validates it. The API accepts any value — `'proffesional'`,
`''`, `'{}'` — and stores it. A client filtering or grouping by type will silently miss
rows, and nothing flags it at write time.

**Fix**
Constrain both layers, consistent with how the project already splits validation:

- [models/Contact.js](../models/Contact.js): `enum: ['personal', 'professional']`
- [routes/contacts.js](../routes/contacts.js): `check('type').optional().isIn([...])` on
  POST and PUT, so a bad value returns a 400 with a field error rather than a 500 from the
  model.

**Acceptance criteria**
- `POST /api/contacts` with `type: 'invalid'` returns 400 naming the field.
- Omitting `type` still defaults to `'personal'`.

---

## D5 — One-hour token, no refresh, no revocation

**Severity:** low for a learning project, blocking for a real client.

**Problem**
[utils/generateToken.js](../utils/generateToken.js) signs with `expiresIn: 3600` and there
is no refresh endpoint. Users are hard-logged-out every hour with no way to extend a
session short of re-entering credentials. There is also no revocation: a stolen token is
valid until it expires, and logout can only ever be a client-side token discard.

**Fix**
Deliberately deferred — this is a design decision, not a defect, and it is the largest
piece of work in any of these specs. Two viable directions:

- **Refresh tokens.** Short-lived access token as today, plus a long-lived refresh token
  stored server-side and exchangeable at `POST /api/auth/refresh`. Gives real revocation.
  Needs a new collection, a rotation strategy, and reuse detection.
- **Longer expiry.** Raise to 24h and accept that revocation is not possible. A few
  characters of work, and honest about its limits.

The client in `client/` now logs in, so the one-hour expiry is visible. The client keeps the
token in `localStorage` and does nothing when it expires. The UI keeps showing the user as
logged in until the next page reload, and contact requests fail with 401 in the meantime.

Recommendation: take the second now. The refresh-token design depends on whether the client
can hold an httpOnly cookie, and that depends on how the client and API are deployed, which
is not decided yet. Moving to it also means taking the token out of `localStorage`. Whichever
is chosen, record it — the current 3600 reads like a default nobody examined.

**Acceptance criteria**
- The chosen expiry is a named constant with a comment explaining the choice.
- If refresh tokens land: refresh rotates the token, a reused refresh token is rejected,
  and logout invalidates the pair server-side.

---

## D6 — `express.json({ extended: false })`

**Severity:** cosmetic.

**Problem**
[server.js](../server.js) passes `extended: false` to `express.json()`. `extended` is an
option of `express.urlencoded()` and is silently ignored here. Harmless, but it implies a
configuration that is not happening, and it is the kind of line that gets copied forward.

**Fix**
`app.use(express.json())`. If URL-encoded bodies are ever needed, add
`express.urlencoded({ extended: false })` as its own line, where the option means
something.

**Acceptance criteria**
- JSON bodies parse as before.
