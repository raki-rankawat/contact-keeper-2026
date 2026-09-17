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

Two apps in one repo: an Express 5 + Mongoose REST API at the root, and a React client in [client/](client/) (see [Client](#client)). The client calls the API with relative `/api/...` URLs. In development the Vite dev server proxies those to Express on :5000 ([client/vite.config.js](client/vite.config.js)). Express does not serve the client build, so there is no production setup for the client yet.

The API mounts three resources in [server.js](server.js): `/api/users` (register), `/api/auth` (login + whoami), `/api/contacts` (CRUD).

The layering is strict and each layer has exactly one job:

- **routes/** — declare the `express-validator` `check()` chain, then `validate`, then `auth`, then hand off to a controller. Validation rules live here, never in controllers or schemas.
- **controllers/** — business logic only. They assume `req.body` is already valid and `req.user` is already populated.
- **models/** — Mongoose schemas. These are effectively unvalidated (see Gotchas).
- **middleware/** — `auth`, `validate`, `errorHandler`.

### Error handling: no try/catch in controllers

Controllers are `async` with **no try/catch**, and that is deliberate. Express 5 auto-forwards a rejected handler promise to error middleware, so any thrown DB or JWT error lands in [middleware/errorHandler.js](middleware/errorHandler.js), which logs the stack and returns a generic `{ msg: 'Internal Server Error' }`. Keep new controllers in this style — adding try/catch that swallows errors breaks the pattern. `errorHandler` must stay the last `app.use` in [server.js](server.js).

Expected failures (bad credentials, missing contact, wrong owner) are returned inline as `res.status(...).json({ msg })` rather than thrown.

### Auth flow

- Token is issued by [utils/generateToken.js](utils/generateToken.js) with payload `{ user: { id } }`, expiring in 3600s. Both register and login return `{ token }`. The API has no refresh, logout, or revocation endpoint. The client's Logout link is client-side only.
- [middleware/auth.js](middleware/auth.js) reads the token from the **`x-auth-token` header** — not `Authorization: Bearer`. It sets `req.user = decoded.user`, so controllers use `req.user.id`.
- Password hashing (bcrypt, salt 10) happens in [controllers/usersController.js](controllers/usersController.js), not in a schema hook.

The header and the nested `{ user: { id } }` payload are both legacy shapes due to change together ([Spec 05 / A1](features/05-auth-features.md)) — moving to `Authorization: Bearer` and a flat `sub` claim. That rewrites `req.user.id` at every call site, so it is a single deliberate commit, not an incremental edit. The same commit must update [client/utils/setAuthToken.js](client/utils/setAuthToken.js), the only place the client names the header.

### Per-user ownership

Contacts are scoped by a `user` ObjectId. `getContacts` filters by `{ user: req.user.id }`; update and delete follow a fixed three-step guard: `findById` → 404 if absent → compare `contact.user.toString() !== req.user.id` → 401. Repeat that guard on any new per-contact route.

This guard is slated to be replaced by a single owner-scoped query that collapses the 401 into a 404 ([Spec 03 / D2](features/03-design-and-performance.md)). Until that lands, follow the three-step pattern above — and if it does land, update this section in the same commit.

### Client

Vite 8 + React 19 SPA with React Router 7. The routes are in [client/src/App.jsx](client/src/App.jsx): `/` (the contacts page, behind `PrivateRoute`), `/about`, `/register`, `/login`, and a `*` 404 page.

- **State is Context + `useReducer`**, with three providers in [client/context/](client/context/): `AuthState`, `ContactState` and `AlertState`. [App.jsx](client/src/App.jsx) nests them in that order, outside `<Router>`. Each provider's folder holds a `*State.jsx` provider, a reducer, and a context file that exports a hook: `useAuth()`, `useContacts()`, `useAlert()`. Each hook throws if it's used outside its provider. Use the hook; don't call `useContext(...)` directly. All action names are in [client/context/types.js](client/context/types.js).
- `client/context/` and `client/utils/` sit *beside* `src/`, not inside it, so components import them as `../../../context/...`.
- **API calls live in the providers, not in components.** [AuthState.jsx](client/context/auth/AuthState.jsx) calls `/api/users` and `/api/auth`, and [ContactState.jsx](client/context/contact/ContactState.jsx) calls `/api/contacts`. Each action is `async` and has its own try/catch, and on failure it dispatches an error action with `data?.errors?.[0]?.msg ?? data?.msg ?? '<fallback>'`. That expression reads both of the API's error shapes. The no-try/catch rule applies only to backend controllers.
- **Auth token.** The token is stored in `localStorage.token`. [setAuthToken.js](client/utils/setAuthToken.js) puts it on `axios.defaults` as the `x-auth-token` header. `App.jsx` sets the header when the module loads if a token exists. `AuthState` calls `loadUser()` (`GET /api/auth`) on mount, but only when a token exists. `login` and `register` save the token and then call `loadUser()`. [PrivateRoute.jsx](client/src/routes/PrivateRoute.jsx) shows a spinner while auth `loading` is true and redirects to `/login` when the user isn't authenticated.
- **Contacts come from the API.** `contacts` starts as `null`, and [Contacts.jsx](client/src/components/contacts/Contacts.jsx) fills it by calling `getContacts()` on mount. Contacts are keyed by their Mongo `_id` everywhere: reducer matching, list keys, and the form's remount key. `ADD_CONTACT` puts the new contact first, matching the API's newest-first order. `clearContacts()` resets the contact state when the user logs out.
- **Alerts.** `setAlert(msg, type, timeout = 5000)` adds an alert with a `uuid` id and removes it when the timeout ends. [Alerts.jsx](client/src/components/Alerts.jsx) renders the alerts above the routes. The login and register pages show auth `error` as an alert, then call `clearErrors()`.
- **Store inputs, derive outputs.** The reducer stores only the filter query. The filtered list is computed at render time in [Contacts.jsx](client/src/components/contacts/Contacts.jsx), so it can't go stale when contacts change. Follow the same approach for anything computed from `contacts`.
- **Edit mode works by remounting the form.** [Home.jsx](client/src/pages/Home.jsx) renders `<ContactForm key={current?._id ?? 'new'} />`, so choosing a different contact creates a fresh form with fresh `useState`. No effect copies `current` into the form, and none should be added. On submit, the form sends the whole contact object, including `_id`, `user` and `date`, to `PUT /api/contacts/:id`.
- **React 19 idioms.** `ref` is passed as an ordinary prop (no `forwardRef`), as in [ContactItem.jsx](client/src/components/contacts/ContactItem.jsx). React 19 removed `findDOMNode`, so `react-transition-group` needs an explicit `nodeRef`. [AnimatedContact.jsx](client/src/components/contacts/AnimatedContact.jsx) wraps `CSSTransition` to supply one, so render list items through it rather than using `CSSTransition` directly.

## Planned work

[features/](features/) holds written specs for planned changes to the API — problem, fix, and acceptance criteria per item. **Apart from T2 and the dev-proxy half of S2, none of it is implemented.** T2 was resolved when `concurrently` was wired to `npm run dev`. The Vite proxy replaced the dead Create React App `proxy` field. S2's `helmet` and `cors` are still missing. The Architecture and Gotchas sections here describe the code as it actually is.

[features/00-implementation-plan.md](features/00-implementation-plan.md) sequences everything by dependency and marks where to stop. Check it before starting non-trivial work. Several items are ordered on purpose, and doing them out of order means doing them twice:

- The breaking API changes (Phase 4) were meant to land before the client called the API. That window has closed: the client now calls every endpoint using the current shapes. Phase 4 still applies, but each of its items now needs a client edit in the same commit, and the plan lists which files. Each new client API call makes Phase 4 cost more.
- The app/server split is shared between the test harness and graceful shutdown.

## Gotchas

These are **known defects with specs attached**, not conventions to preserve. Do not work around them silently, and do not fix them opportunistically in an unrelated change — each has acceptance criteria, and two carry data concerns: fixing `dev-db` (T4) points the app at a different database than the one holding current data, and turning on schema validation (C7) may reject documents already written without it.

- **`config/db.js` hardcodes `dbName: 'dev-db'`**, which overrides whatever database path segment is in `MONGO_URI` — contradicting the comment in `.env.example`. Change the code, not the URI, to point at a different database. → [T4](features/04-tooling.md)
- **Schemas use `require:` instead of `required:`** (a typo, in both models), so Mongoose enforces nothing. All request validation is the `express-validator` chains in routes/. → [C7](features/01-correctness-bugs.md)
- **`Contact.user` has `ref: 'users'` but the User model registers as `'user'`** — any future `.populate('user')` will fail until one side is fixed. → [T3](features/04-tooling.md)
- **Middleware order in [routes/contacts.js](routes/contacts.js) is inconsistent**: POST and PUT run `[regCheck, validate]` *before* `auth`, so an unauthenticated request with a bad body gets a 400 instead of a 401. GET and DELETE run `auth` alone. → [S4](features/02-security-hardening.md)
- **PUT `/api/contacts/:id` cannot do partial updates.** The route requires a non-empty `name` while the controller is written for partial updates — they contradict each other. The client isn't affected by that, because it always sends the whole contact. But the controller's `if (email)`-style guards drop empty strings, so clearing a field in the edit form does nothing, and the response comes back with the old value. → [C3](features/01-correctness-bugs.md)
- **A malformed `:id` returns 500**, because the Mongoose `CastError` reaches `errorHandler` as an unexpected error. → [C2](features/01-correctness-bugs.md)
- **`.env.example` cannot boot the app** — it lists `JWT_SECRET` commented out, but `config/env.js` requires it. → [C1](features/01-correctness-bugs.md)
- **No `cors` and no `helmet`.** This never shows up locally, because the Vite dev proxy makes client requests same-origin. But the proxy exists only in the dev server. If the client and API are ever served from different origins, every request will fail until `cors` is added, and the CORS config must allow the `x-auth-token` header. → [S2](features/02-security-hardening.md)

## Conventions

- **Backend is CommonJS** (`require`/`module.exports`). **Client is ESM** (`"type": "module"` in [client/package.json](client/package.json)), with components in `.jsx`. Don't mix the two.
- Both apps use the same style: no semicolons, single quotes, 2-space indent, trailing commas, arrow functions. No Prettier config — match surrounding files. (Adding one is proposed in [T5](features/04-tooling.md) but not agreed; until it is, this line is the rule.)
- Every controller carries a `@route / @desc / @access` comment block above it.
- Commits follow conventional-commit format; the project skill [.claude/skills/commit-msg/SKILL.md](.claude/skills/commit-msg/SKILL.md) (`/commit-msg`) generates them from the staged diff and forbids attribution trailers.
