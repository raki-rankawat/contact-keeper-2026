# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # API + client together, via concurrently
npm run dev:server           # API only — nodemon server.js, restarts on change
npm run dev:client           # client only — Vite dev server (http://localhost:5173)
npm start                    # plain node server.js

npm --prefix client install  # client has its own package.json and node_modules
npm --prefix client run lint # ESLint, client only
npm --prefix client run build
```

There is no test runner anywhere, and the backend has no linter or formatter. The client has the Vite scaffold's ESLint config ([client/eslint.config.js](client/eslint.config.js)) and no formatter. Backend tests and linting are specced in [features/04-tooling.md](features/04-tooling.md) — note that adding a formatter contradicts a convention stated below and needs the user's decision first.

Requires a `.env` (copy `.env.example`). `config/env.js` hard-fails the process at boot if `MONGO_URI` or `JWT_SECRET` is missing, so a bad env shows up as an immediate exit, not a runtime 500.

## Architecture

Two apps in one repo: an Express 5 + Mongoose REST API at the root, and a React client in [client/](client/) (see [Client](#client)). **The client does not call the API yet.**

The API mounts three resources in [server.js](server.js): `/api/users` (register), `/api/auth` (login + whoami), `/api/contacts` (CRUD).

The layering is strict and each layer has exactly one job:

- **routes/** — declare the `express-validator` `check()` chain, then `validate`, then `auth`, then hand off to a controller. Validation rules live here, never in controllers or schemas.
- **controllers/** — business logic only. They assume `req.body` is already valid and `req.user` is already populated.
- **models/** — Mongoose schemas. These are effectively unvalidated (see Gotchas).
- **middleware/** — `auth`, `validate`, `errorHandler`.

### Error handling: no try/catch anywhere

Controllers are `async` with **no try/catch**, and that is deliberate. Express 5 auto-forwards a rejected handler promise to error middleware, so any thrown DB or JWT error lands in [middleware/errorHandler.js](middleware/errorHandler.js), which logs the stack and returns a generic `{ msg: 'Internal Server Error' }`. Keep new controllers in this style — adding try/catch that swallows errors breaks the pattern. `errorHandler` must stay the last `app.use` in [server.js](server.js).

Expected failures (bad credentials, missing contact, wrong owner) are returned inline as `res.status(...).json({ msg })` rather than thrown.

### Auth flow

- Token is issued by [utils/generateToken.js](utils/generateToken.js) with payload `{ user: { id } }`, expiring in 3600s. Both register and login return `{ token }`. There is no refresh, logout, or revocation path.
- [middleware/auth.js](middleware/auth.js) reads the token from the **`x-auth-token` header** — not `Authorization: Bearer`. It sets `req.user = decoded.user`, so controllers use `req.user.id`.
- Password hashing (bcrypt, salt 10) happens in [controllers/usersController.js](controllers/usersController.js), not in a schema hook.

The header and the nested `{ user: { id } }` payload are both legacy shapes due to change together ([Spec 05 / A1](features/05-auth-features.md)) — moving to `Authorization: Bearer` and a flat `sub` claim. That rewrites `req.user.id` at every call site, so it is a single deliberate commit, not an incremental edit.

### Per-user ownership

Contacts are scoped by a `user` ObjectId. `getContacts` filters by `{ user: req.user.id }`; update and delete follow a fixed three-step guard: `findById` → 404 if absent → compare `contact.user.toString() !== req.user.id` → 401. Repeat that guard on any new per-contact route.

This guard is slated to be replaced by a single owner-scoped query that collapses the 401 into a 404 ([Spec 03 / D2](features/03-design-and-performance.md)). Until that lands, follow the three-step pattern above — and if it does land, update this section in the same commit.

### Client

Vite 8 + React 19 SPA with React Router 7 (`/` and `/about`, in [client/src/App.jsx](client/src/App.jsx)).

- **Local state only.** Contacts live in memory, seeded with three sample contacts in [client/context/contact/ContactState.jsx](client/context/contact/ContactState.jsx). New ones get a `uuid` v4 `id`, not a Mongo `_id`. A page reload resets everything. `axios` is installed but not imported anywhere, and there are no auth pages.
- **State is Context + `useReducer`**, in [client/context/](client/context/). That folder sits *beside* `src/`, not inside it, so components import it as `../../../context/...`. Action names are in [client/context/types.js](client/context/types.js). `SET_ALERT` / `REMOVE_ALERT` are declared there but nothing uses them yet.
- Components read state through `useContacts()` ([contactContext.js](client/context/contact/contactContext.js)), which throws if it's used outside `<ContactState>`. Don't call `useContext(ContactContext)` directly.
- **Store inputs, derive outputs.** The reducer stores only the filter query. The filtered list is computed at render time in [Contacts.jsx](client/src/components/contacts/Contacts.jsx), so it can't go stale when contacts change. Follow the same approach for anything computed from `contacts`.
- **Edit mode works by remounting the form.** [Home.jsx](client/src/pages/Home.jsx) renders `<ContactForm key={current?.id ?? 'new'} />`, so choosing a different contact creates a fresh form with fresh `useState`. There is no effect that copies `current` into the form, and none should be added.
- **React 19 idioms.** `ref` is passed as an ordinary prop (no `forwardRef`), as in [ContactItem.jsx](client/src/components/contacts/ContactItem.jsx). React 19 removed `findDOMNode`, so `react-transition-group` needs an explicit `nodeRef`. [AnimatedContact.jsx](client/src/components/contacts/AnimatedContact.jsx) wraps `CSSTransition` to supply one, so render list items through it rather than using `CSSTransition` directly.

## Planned work

[features/](features/) holds written specs for planned changes to the API — problem, fix, and acceptance criteria per item. **Apart from T2, none of it is implemented.** T2 was resolved when `concurrently` was wired to `npm run dev`. The Architecture and Gotchas sections here describe the code as it actually is.

[features/00-implementation-plan.md](features/00-implementation-plan.md) sequences everything by dependency and marks where to stop. Check it before starting non-trivial work. Several items are ordered on purpose, and doing them out of order means doing them twice:

- The breaking API changes are batched before the client starts calling the API. The client exists, but it doesn't make API calls yet, so that window is still open. Wiring the client to the current API shapes closes it.
- The app/server split is shared between the test harness and graceful shutdown.

## Gotchas

These are **known defects with specs attached**, not conventions to preserve. Do not work around them silently, and do not fix them opportunistically in an unrelated change — each has acceptance criteria, and two carry data concerns: fixing `dev-db` (T4) points the app at a different database than the one holding current data, and turning on schema validation (C7) may reject documents already written without it.

- **`config/db.js` hardcodes `dbName: 'dev-db'`**, which overrides whatever database path segment is in `MONGO_URI` — contradicting the comment in `.env.example`. Change the code, not the URI, to point at a different database. → [T4](features/04-tooling.md)
- **Schemas use `require:` instead of `required:`** (a typo, in both models), so Mongoose enforces nothing. All request validation is the `express-validator` chains in routes/. → [C7](features/01-correctness-bugs.md)
- **`Contact.user` has `ref: 'users'` but the User model registers as `'user'`** — any future `.populate('user')` will fail until one side is fixed. → [T3](features/04-tooling.md)
- **Middleware order in [routes/contacts.js](routes/contacts.js) is inconsistent**: POST and PUT run `[regCheck, validate]` *before* `auth`, so an unauthenticated request with a bad body gets a 400 instead of a 401. GET and DELETE run `auth` alone. → [S4](features/02-security-hardening.md)
- **PUT `/api/contacts/:id` cannot do partial updates.** The route requires a non-empty `name` while the controller is written for partial updates — they contradict each other. → [C3](features/01-correctness-bugs.md)
- **A malformed `:id` returns 500**, because the Mongoose `CastError` reaches `errorHandler` as an unexpected error. → [C2](features/01-correctness-bugs.md)
- **`.env.example` cannot boot the app** — it lists `JWT_SECRET` commented out, but `config/env.js` requires it. → [C1](features/01-correctness-bugs.md)
- **The dev proxy is a dead setting.** The root [package.json](package.json) has `"proxy": "http://localhost:5000"`, a Create React App field. Vite ignores it, and it sits in the wrong package.json anyway. [client/vite.config.js](client/vite.config.js) has no `server.proxy`, so the first relative `/api/...` call from the client will hit Vite on :5173, not Express. The server has no `cors` either. → [S2](features/02-security-hardening.md)

## Conventions

- **Backend is CommonJS** (`require`/`module.exports`). **Client is ESM** (`"type": "module"` in [client/package.json](client/package.json)), with components in `.jsx`. Don't mix the two.
- Both apps use the same style: no semicolons, single quotes, 2-space indent, trailing commas, arrow functions. No Prettier config — match surrounding files. (Adding one is proposed in [T5](features/04-tooling.md) but not agreed; until it is, this line is the rule.)
- Every controller carries a `@route / @desc / @access` comment block above it.
- Commits follow conventional-commit format; the project skill [.claude/skills/commit-msg/SKILL.md](.claude/skills/commit-msg/SKILL.md) (`/commit-msg`) generates them from the staged diff and forbids attribution trailers.
