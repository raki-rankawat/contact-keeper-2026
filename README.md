# Contact Keeper 2026

A REST API for managing personal contacts. Users register, log in with a JWT, and get a private contact list that only they can read or modify.

> **Status:** backend only. The React frontend is not built yet — see [Roadmap](#roadmap).

## Tech stack

| | |
| --- | --- |
| Runtime | Node.js (CommonJS) |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |
| Validation | `express-validator` |
| Dev | `nodemon` |

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB database (local `mongod` or a MongoDB Atlas cluster)

### Install

```bash
git clone <repo-url>
cd contact-keeper-2026
npm install
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

### Run

```bash
npm run server   # development, auto-restarts on file changes
npm start        # plain node
```

The server logs `Server started on port 5000` and `MongoDB connected — db: dev-db` when it comes up healthy.

## Authentication

Register or log in to get a token, then send it on every private request in the **`x-auth-token`** header:

```
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This is a custom header, **not** `Authorization: Bearer`. Tokens expire after **1 hour**.

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

`name` is the only field required on write. `type` is a free-form string that defaults to `personal`.

#### `GET /api/contacts` — list — *private*

**200** → array of the caller's contacts, newest first.

#### `POST /api/contacts` — create — *private*

```json
{ "name": "Grace Hopper", "email": "grace@example.com", "phone": "555-0100", "type": "professional" }
```

**200** → the created contact.

#### `PUT /api/contacts/:id` — update — *private*

Send only the fields you want changed (`name` must still be present). Omitted fields are left untouched.

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
server.js     app bootstrap and route mounting
```

Requests flow **route → validation → auth → controller → model**. Routes own the validation rules; controllers assume a valid body and an authenticated `req.user`.

## Roadmap

- [ ] React frontend in `client/` (`concurrently` is already installed to run API and client together)
- [ ] Automated tests — there is no test suite yet
- [ ] Refresh tokens / longer-lived sessions
