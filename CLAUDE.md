# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run server   # dev — nodemon server.js, restarts on change
npm start        # plain node server.js
```

There is no test runner, linter, or formatter configured. `concurrently` sits in devDependencies for a client app that does not exist yet.

Requires a `.env` (copy `.env.example`). `config/env.js` hard-fails the process at boot if `MONGO_URI` or `JWT_SECRET` is missing, so a bad env shows up as an immediate exit, not a runtime 500.

## Architecture

Express 5 + Mongoose REST API. No frontend. Three resources mounted in [server.js](server.js): `/api/users` (register), `/api/auth` (login + whoami), `/api/contacts` (CRUD).

The layering is strict and each layer has exactly one job:

- **routes/** — declare the `express-validator` `check()` chain, then `validate`, then `auth`, then hand off to a controller. Validation rules live here, never in controllers or schemas.
- **controllers/** — business logic only. They assume `req.body` is already valid and `req.user` is already populated.
- **models/** — Mongoose schemas. These are effectively unvalidated (see Gotchas).
- **middleware/** — `auth`, `validate`, `errorHandler`.

### Error handling: no try/catch anywhere

Controllers are `async` with **no try/catch**, and that is deliberate. Express 5 auto-forwards a rejected handler promise to error middleware, so any thrown DB or JWT error lands in [middleware/errorHandler.js](middleware/errorHandler.js), which logs the stack and returns a generic `{ msg: 'Internal Server Error' }`. Keep new controllers in this style — adding try/catch that swallows errors breaks the pattern. `errorHandler` must stay the last `app.use` in [server.js](server.js).

Expected failures (bad credentials, missing contact, wrong owner) are returned inline as `res.status(...).json({ msg })` rather than thrown.

### Auth flow

- Token is issued by [utils/generateToken.js](utils/generateToken.js) with payload `{ user: { id } }`, expiring in 3600s. Both register and login return `{ token }`.
- [middleware/auth.js](middleware/auth.js) reads the token from the **`x-auth-token` header** — not `Authorization: Bearer`. It sets `req.user = decoded.user`, so controllers use `req.user.id`.
- Password hashing (bcrypt, salt 10) happens in [controllers/usersController.js](controllers/usersController.js), not in a schema hook.

### Per-user ownership

Contacts are scoped by a `user` ObjectId. `getContacts` filters by `{ user: req.user.id }`; update and delete follow a fixed three-step guard: `findById` → 404 if absent → compare `contact.user.toString() !== req.user.id` → 401. Repeat that guard on any new per-contact route.

## Gotchas

- **`config/db.js` hardcodes `dbName: 'dev-db'`**, which overrides whatever database path segment is in `MONGO_URI` — contradicting the comment in `.env.example`. Change the code, not the URI, to point at a different database.
- **Schemas use `require:` instead of `required:`** (a typo, in both models), so Mongoose enforces nothing. All request validation is the `express-validator` chains in routes/.
- **`Contact.user` has `ref: 'users'` but the User model registers as `'user'`** — any future `.populate('user')` will fail until one side is fixed.
- **Middleware order in [routes/contacts.js](routes/contacts.js) is inconsistent**: POST and PUT run `[regCheck, validate]` *before* `auth`, so an unauthenticated request with a bad body gets a 400 instead of a 401. GET and DELETE run `auth` alone.

## Conventions

- CommonJS (`require`/`module.exports`), not ESM.
- No semicolons, single quotes, 2-space indent, trailing commas, arrow functions. No Prettier config — match surrounding files.
- Every controller carries a `@route / @desc / @access` comment block above it.
- Commits follow conventional-commit format; the project skill [.claude/skills/commit-msg/SKILL.md](.claude/skills/commit-msg/SKILL.md) (`/commit-msg`) generates them from the staged diff and forbids attribution trailers.
