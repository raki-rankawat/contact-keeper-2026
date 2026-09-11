# Spec 01 — Correctness Bugs

Defects where the API does something other than what it claims to do. Everything here
is user-visible today and fixable with a small diff. Do these first.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.
Controllers stay `async` with **no try/catch** — see the error-handling section of
[CLAUDE.md](../CLAUDE.md).

---

## C1 — `.env.example` cannot boot the app

**Severity:** high — blocks first-run setup for every new contributor.

**Problem**
[config/env.js](../config/env.js) hard-requires `JWT_SECRET` and calls `process.exit(1)`
when it is missing. [.env.example](../.env.example) still lists it commented out under
`# Needed once auth lands`. Auth has landed. Copying the example file to `.env`, exactly
as the README and the file's own first line instruct, produces an immediate exit.

**Fix**
Uncomment `JWT_SECRET` in `.env.example` and give it a placeholder that reads as a
placeholder (e.g. `JWT_SECRET=replace-me-with-a-long-random-string`). While in the file,
drop the stale `# Needed once auth lands` comment.

**Acceptance criteria**
- `cp .env.example .env` followed by filling in only `MONGO_URI` boots the server.
- No commented-out variable in `.env.example` is listed as required in `config/env.js`.

---

## C2 — A malformed `:id` returns 500 instead of 4xx

**Severity:** high — client typos are reported as server faults.

**Problem**
`Contact.findById(req.params.id)` in [controllers/contactsController.js](../controllers/contactsController.js)
(update and delete) rejects with a Mongoose `CastError` when the id is not a valid
ObjectId. Express 5 forwards the rejection to
[middleware/errorHandler.js](../middleware/errorHandler.js), which returns
`500 { msg: 'Internal Server Error' }`. `PUT /api/contacts/abc` is a client error, not a
server error.

**Fix** — pick one, do not do both:

- *Preferred, matches the layering rule:* add `check('id', 'Invalid contact id').isMongoId()`
  to the PUT and DELETE chains in [routes/contacts.js](../routes/contacts.js). Validation
  rules belong in routes, so this keeps the existing convention intact.
- *Alternative:* handle `err.name === 'CastError'` in `errorHandler` and map it to 400.
  Broader coverage, but pushes request-shape knowledge into the error layer.

**Acceptance criteria**
- `PUT /api/contacts/abc` and `DELETE /api/contacts/abc` return 400 with a JSON body.
- A well-formed but non-existent id still returns 404.
- No route emits 500 for a malformed path parameter.

---

## C3 — PUT cannot perform a partial update

**Severity:** high — documented behaviour and actual behaviour disagree.

**Problem**
[routes/contacts.js](../routes/contacts.js) applies `regCheck` to PUT, which requires a
non-empty `name`. But `updateContact` in
[controllers/contactsController.js](../controllers/contactsController.js) is written
entirely for partial updates — it builds `contactFields` behind `if (name)`, `if (email)`,
`if (phone)`, `if (type)` guards. The route forbids the very requests the controller was
designed to serve: updating only a phone number is impossible without re-sending the name.

**Fix**
Give PUT its own validation chain rather than reusing `regCheck`. Each field optional,
validated only when present:

```js
const updateCheck = [
  check('name', 'Name cannot be empty').optional().notEmpty(),
]
```

Keep `regCheck` on POST, where a required `name` is correct.

**Acceptance criteria**
- `PUT /api/contacts/:id` with body `{ "phone": "555-0100" }` succeeds and leaves `name`
  untouched.
- `PUT` with `{ "name": "" }` still returns 400.
- `POST /api/contacts` with no `name` still returns 400.

---

## C4 — Email matching is case-sensitive

**Severity:** medium — silently creates duplicate accounts.

**Problem**
`User.findOne({ email })` in [controllers/usersController.js](../controllers/usersController.js)
and [controllers/authController.js](../controllers/authController.js) compares raw strings.
`Rakesh@example.com` and `rakesh@example.com` register as two distinct users, and a login
that differs from the registered casing fails with `Invalid credentials`. The `unique: true`
index on the schema does not save you — it is equally case-sensitive.

**Fix**
Normalise at one boundary and only one, so the stored value and every lookup agree. Add
`lowercase: true` to the `email` field in [models/User.js](../models/User.js) — Mongoose
applies it to both writes and query filters on that path, covering register and login
together.

Note the ordering dependency: if any mixed-case emails already exist in the database, they
must be migrated down-cased before the unique index can be trusted.

**Acceptance criteria**
- Registering `Foo@example.com` then `foo@example.com` returns 400 `User already exists`.
- Logging in with any casing of a registered address succeeds.

---

## C5 — Mass assignment in `addContact`

**Severity:** medium — client controls fields it should not.

**Problem**
[controllers/contactsController.js](../controllers/contactsController.js) builds the new
document from `{ ...req.body, user: req.user.id }`. The `user` field is safely overridden
by the later key, and Mongoose strict mode drops unknown paths — but `_id` and `date` are
real schema paths, so a client can choose its own document id and backdate a contact to
control its position in the `date: -1` sort.

**Fix**
Destructure explicitly, mirroring how `updateContact` already works:

```js
const { name, email, phone, type } = req.body
const newContact = new Contact({ name, email, phone, type, user: req.user.id })
```

**Acceptance criteria**
- `POST /api/contacts` with `_id` in the body creates a contact with a server-generated id.
- `POST` with `date` in the body stores the current timestamp, not the supplied one.

---

## C6 — Duplicate-registration race returns 500

**Severity:** low — narrow window, ugly failure.

**Problem**
In [controllers/usersController.js](../controllers/usersController.js) the `findOne`
existence check and the `User.create` are two separate round-trips. Two concurrent
registrations for the same address can both pass the check; the second insert violates the
unique index, throws `E11000`, and reaches `errorHandler` as a 500 — even though the
intended answer, 400 `User already exists`, is already written twelve lines above.

**Fix**
Keep the fast-path `findOne` (it produces the good error message in the common case) and
map the index violation onto the same response. Detect `err.code === 11000` in
[middleware/errorHandler.js](../middleware/errorHandler.js) and return
`400 { msg: 'Duplicate value' }`, or narrow it to the users route if a generic message is
too vague.

Do not wrap the controller in try/catch — that breaks the project-wide pattern.

**Acceptance criteria**
- Two simultaneous registrations for one address yield one 200 and one 400. Neither is 500.

---

## C7 — Schemas validate nothing (`require:` vs `required:`)

**Severity:** medium — silent, and the kind of typo that outlives the project.

**Problem**
Both [models/User.js](../models/User.js) and [models/Contact.js](../models/Contact.js)
spell the option `require:` instead of `required:`. Mongoose does not recognise `require`,
ignores it without warning, and enforces no constraint at all. Every guarantee the API
currently offers comes from the `express-validator` chains in `routes/`. This is listed as
a known gotcha in [CLAUDE.md](../CLAUDE.md); it is a bug, not a convention.

**Fix**
Correct the spelling in both models. Then re-read the validator chains as a set, because
the schema will start rejecting things it previously waved through — in particular
`Contact.user` has no `required` at all today and should get one, since every write path
already sets it.

Routes remain the source of truth for request validation. The schema is the last line of
defence for anything that reaches the model by another path.

**Acceptance criteria**
- Creating a `User` directly via the model with no `email` rejects with a ValidationError.
- Creating a `Contact` with no `user` rejects.
- The full existing request surface still behaves as before — schema validation must not
  start rejecting requests the routes accept.
