# Contact Keeper 2026

A contact manager: a REST API where users register, log in with a JWT, and get a private contact list that only they can read or modify, plus a React client.

> **Status:** the API is complete. The React client in `client/` can add, edit, delete, filter, and animate contacts, but it keeps them **in memory** (seeded with sample data) and does not call the API yet. It has no login either. See [Roadmap](#roadmap).

## Tech stack

| | |
| --- | --- |
| API runtime | Node.js (CommonJS) |
| API framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |
| Validation | `express-validator` |
| Client | React 19 + Vite 8 (ESM), React Router 7, `react-transition-group` |
| Dev | `nodemon`, `concurrently`, ESLint (client only) |

## Getting started

### Prerequisites

- Node.js 20.19+ (Vite 8's minimum; the API alone runs on 18+)
- A MongoDB database (local `mongod` or a MongoDB Atlas cluster)

### Install

The client has its own `package.json`, so install both:

```bash
git clone <repo-url>
cd contact-keeper-2026
npm install
npm --prefix client install
```

### Configure

Copy the example env file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret used to sign tokens — use a long random string |
| `PORT` | no | Defaults to `5000` |

`MONGO_URI` and `JWT_SECRET` are checked at boot by `config/env.js`. If either is missing the process prints the missing names and exits immediately rather than failing later on the first request.

> **Note:** the database name is currently hardcoded as `dev-db` in `config/db.js`, which overrides the database path segment in `MONGO_URI`. Change it there if you want a different database.
>
> This is slated to be removed — see [Spec 04 / T4](features/04-tooling.md). Until then, a correct production `MONGO_URI` still writes to `dev-db`.

### Run

```bash
npm run dev          # API + client together
npm run dev:server   # API only, auto-restarts on file changes
npm run dev:client   # client only
npm start            # API with plain node
```

The API logs `Server started on port 5000` and `MongoDB connected — db: dev-db` when it comes up healthy. The client is served by Vite at `http://localhost:5173`.

Because the client doesn't call the API yet, `npm run dev:client` works on its own, with no MongoDB or `.env` needed.

## Authentication

Register or log in to get a token, then send it on every private request in the **`x-auth-token`** header:

```
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This is a custom header, **not** `Authorization: Bearer`. Tokens expire after **1 hour**, and there is no refresh endpoint — clients must log in again when a token expires.

> **Planned change:** both of these are due to move to standards — `Authorization: Bearer` in [Spec 05 / A1](features/05-auth-features.md), and an access/refresh token split in [A2](features/05-auth-features.md). Treat the header as unstable if you are building a client now.

Requests to a private route without a token get `401 { "msg": "No token, authorization denied" }`; with a bad or expired token, `401 { "msg": "Invalid token, authorization denied" }`.

## API reference

Base URL: `http://localhost:5000`

### Users

#### `POST /api/users` — register — *public*

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "secret123" }
```

`name` required, `email` must be valid, `password` must be 6+ characters.

**200** → `{ "token": "..." }`
**400** → `{ "msg": "User already exists" }`

### Auth

#### `POST /api/auth` — log in — *public*

```json
{ "email": "ada@example.com", "password": "secret123" }
```

**200** → `{ "token": "..." }`
**400** → `{ "msg": "Invalid credentials" }`

#### `GET /api/auth` — current user — *private*

**200** → the user document without the password field:

```json
{ "_id": "...", "name": "Ada Lovelace", "email": "ada@example.com", "date": "2026-09-11T..." }
```

### Contacts

All contact routes are private and operate only on the caller's own contacts.

A contact looks like:

```json
{
  "_id": "...",
  "user": "...",
  "name": "Grace Hopper",
  "email": "grace@example.com",
  "phone": "555-0100",
  "type": "professional",
  "date": "2026-09-11T..."
}
```

`name` is the only field required on write. `type` is a free-form string that defaults to `personal` — it is **not** currently constrained to `personal` / `professional` ([Spec 03 / D4](features/03-design-and-performance.md) adds the enum).

There is no single-contact read endpoint yet; fetch the list and filter client-side ([Spec 06 / F1](features/06-contacts-features.md)).

#### `GET /api/contacts` — list — *private*

**200** → array of the caller's contacts, newest first.

Returns **every** contact the caller owns — there is no pagination, no search, and no sort option. [Spec 06 / F2–F3](features/06-contacts-features.md) add all three, which will change this response from a bare array to an object with pagination metadata.

#### `POST /api/contacts` — create — *private*

```json
{ "name": "Grace Hopper", "email": "grace@example.com", "phone": "555-0100", "type": "professional" }
```

**200** → the created contact.

#### `PUT /api/contacts/:id` — update — *private*

Send only the fields you want changed (`name` must still be present). Omitted fields are left untouched.

> The `name` requirement on PUT is a bug, not a design choice — the route's validation chain contradicts the controller, which is written for partial updates. See [Spec 01 / C3](features/01-correctness-bugs.md).

**200** → the updated contact
**404** → `{ "msg": "No contact found" }`
**401** → `{ "msg": "Not authorized" }` if the contact belongs to someone else

#### `DELETE /api/contacts/:id` — delete — *private*

**200** → `{ "msg": "Contact removed" }`
**404** / **401** → as above

### Error format

Validation failures return **400** with the `express-validator` array:

```json
{ "errors": [{ "type": "field", "msg": "Please enter a password with 6 or more chars", "path": "password", "location": "body" }] }
```

Unexpected server errors return **500** `{ "msg": "Internal Server Error" }` — the stack is logged server-side, never sent to the client.

Two known rough edges for client authors:

- A **malformed** `:id` (not a valid ObjectId) currently returns 500 rather than 400 — see [Spec 01 / C2](features/01-correctness-bugs.md).
- The response shape is not consistent across the API: bare objects, bare arrays, `{ msg }`, and `{ errors: [...] }` are all in use, and errors carry no machine-readable code. [Spec 07 / P7](features/07-api-platform.md) unifies this, and it is a breaking change.

## Example session

```bash
# Register and capture the token
TOKEN=$(curl -s -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"secret123"}' \
  | jq -r .token)

# Add a contact
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" \
  -d '{"name":"Grace Hopper","email":"grace@example.com","type":"professional"}'

# List them
curl http://localhost:5000/api/contacts -H "x-auth-token: $TOKEN"
```

## Project structure

```
config/       env validation + Mongo connection
routes/       endpoint definitions, validation chains, auth guards
controllers/  request handlers (business logic)
models/       Mongoose schemas — User, Contact
middleware/   auth (JWT), validate (express-validator), errorHandler
utils/        token generation
features/     specs for planned work — not code
server.js     app bootstrap and route mounting

client/
  context/    React Context + useReducer state (contacts, current, filter)
  src/
    pages/       Home, About
    components/  contacts/ (form, list, item, filter), layout/ (navbar)
```

API requests flow **route → validation → auth → controller → model**. Routes own the validation rules; controllers assume a valid body and an authenticated `req.user`.

## Roadmap

Planned work lives in [features/](features/) as written specs — problem, fix, and
acceptance criteria per item. Apart from T2 (`concurrently` now drives `npm run dev`),
nothing in them is implemented yet; the API reference above describes what the code
actually does today.

**Start with [features/00-implementation-plan.md](features/00-implementation-plan.md)** — it
sequences all 44 items by dependency and says where to stop. The specs themselves are
reference material, not a reading list.

| Spec | Covers |
| --- | --- |
| [01 — Correctness bugs](features/01-correctness-bugs.md) | Broken `.env.example`, 500s on malformed ids, PUT partial updates, email casing, dead schema validation |
| [02 — Security hardening](features/02-security-hardening.md) | Auth rate limiting, `helmet`/`cors`, login timing, middleware order |
| [03 — Design & performance](features/03-design-and-performance.md) | Query index, ownership guard, 404 handler, `type` enum, token lifetime |
| [04 — Tooling](features/04-tooling.md) | Test harness, unused deps, `ref` mismatch, hardcoded `dev-db`, linting |
| [05 — Auth features](features/05-auth-features.md) | Bearer tokens, refresh tokens, logout, password reset, email verification |
| [06 — Contacts features](features/06-contacts-features.md) | Read-one, search, pagination, CSV import/export, favourites, soft delete |
| [07 — API platform](features/07-api-platform.md) | Graceful shutdown, health check, logging, OpenAPI, versioning |

Short version of the plan:

- [ ] **Phase 0–1** — one-line fixes, then the test harness and graceful shutdown (~1 day, most of the risk)
- [ ] **Phase 2–3** — correctness bugs, then rate limiting and security headers
- [ ] **Phase 4** — the breaking changes (bearer auth, `/api/v1/`, response envelope). Time-sensitive: cheap while the client has no API calls, expensive once it does
- [ ] **Phase 5+** — query layer, refresh tokens, operability, product features — justified by real users or data volume, not by principle

### Still unplanned

The client work has no specs. It is being built step by step, and these pieces are still missing:

- **Connect the client to the API.** Replace the in-memory seed data with `axios` calls, and fix the dev proxy first. The root `package.json` has a Create React App `proxy` field that Vite ignores. See [Spec 02 / S2](features/02-security-hardening.md).
- **Auth UI.** Register and login pages, token storage, and protected routes.
- **Alerts.** The `SET_ALERT` / `REMOVE_ALERT` action types are declared but not implemented.
