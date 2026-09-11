# Spec 05 — Auth & Identity Features

New capability for the auth system. This spec is where the decision deferred in
[Spec 03 / D5](03-design-and-performance.md) actually gets made.

Sequencing matters here more than in the fix specs. A5 and A6 both need an email provider,
and A2 is far cheaper to do before A3 than after. Suggested order: **A1 → A2 → A3 → A4**,
then A5/A6 together, then the rest.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.

---

## A1 — `Authorization: Bearer` instead of `x-auth-token`

**Value:** high. **Effort:** low. **Do this first.**

**What**
[middleware/auth.js](../middleware/auth.js) reads the token from a custom `x-auth-token`
header. Move to the standard `Authorization: Bearer <token>`.

**Why it matters more than it looks**
The custom header is a legacy of the MERN-tutorial lineage this project comes from, and
everything downstream pays for it: Swagger UI's "Authorize" button, Postman's auth tab,
most API gateways, every HTTP client's built-in auth helper, and any future OAuth work all
assume `Authorization`. With `x-auth-token` each of those needs manual configuration, and
some cannot be configured at all. It also has to be explicitly allowlisted in the CORS
config from [Spec 02 / S2](02-security-hardening.md) or browser preflight strips it — a
failure that appears only in the browser and never in Postman.

**Design**
Parse the scheme properly rather than treating the whole header value as the token:

```js
const header = req.header('authorization') || ''
const [scheme, token] = header.split(' ')

if (scheme !== 'Bearer' || !token) {
  return res.status(401).json({ msg: 'No token, authorization denied' })
}
```

*Migration.* If anything already consumes this API, accept both headers for one release —
prefer `Authorization`, fall back to `x-auth-token`, and log when the fallback fires.
Remove the fallback once the log goes quiet. If nothing consumes it yet, cut over directly
and skip the dual-read entirely.

**Worth folding in while here.** The JWT payload is `{ user: { id } }`
([utils/generateToken.js](../utils/generateToken.js)), a nested shape from the same
tutorial lineage. The registered claim for a subject is `sub`. Flattening to
`{ sub: userId }` makes the token readable by standard tooling, but it changes
`req.user.id` at every call site in the controllers — do it in the same commit as the
header change or not at all, since both are breaking and one migration is cheaper than two.

**Acceptance criteria**
- `Authorization: Bearer <token>` authenticates on every private route.
- A missing scheme, a wrong scheme, or a bare token returns 401.
- The CORS `allowedHeaders` list names `Authorization`.
- If the payload flattened: no controller still reads `req.user.id` from the old shape.

---

## A2 — Refresh tokens

**Value:** high. **Effort:** medium-high. **Depends on:** A1.

**What**
Split the single 1-hour token into a short-lived access token and a long-lived refresh
token, exchangeable at `POST /api/auth/refresh`.

**Why**
Today's token lives 3600s with no renewal path, so users are hard-logged-out hourly. The
naive fix — a longer expiry — makes the real problem worse: a JWT cannot be revoked, so a
stolen 30-day token is valid for 30 days no matter what the server does. Refresh tokens
resolve the tension. The access token stays short enough that theft has a small window; the
refresh token is stateful, so it can actually be revoked.

**Design**

| | Access token | Refresh token |
|---|---|---|
| Format | JWT, as today | Opaque random string (32+ bytes) |
| Lifetime | 15 minutes | 7–30 days |
| Storage | Client memory | Hashed in MongoDB |
| Verified by | Signature only | Database lookup |

The refresh token must **not** be a JWT — the entire point is that it is checkable against
server state. Store only a hash of it, the same reasoning as passwords: a database leak
must not hand over usable sessions.

*Rotation.* Every refresh issues a new refresh token and invalidates the one presented.
Single-use.

*Reuse detection.* If an already-invalidated token is presented, treat it as theft — the
legitimate client and the attacker now both hold tokens from the same family. Revoke every
token in that family and force re-login. This is the piece that makes rotation worth
implementing, and the piece most often skipped.

*Where the client keeps it.* An httpOnly, Secure, SameSite cookie if the client is a
browser; the response body if it is native. This choice determines CSRF exposure, so make
it explicitly — the cookie path needs CSRF protection on the refresh endpoint, the body
path does not.

New model, roughly:

```js
{
  user: ObjectId,
  tokenHash: String,
  family: String,      // shared by every token in a rotation lineage
  expiresAt: Date,     // TTL index — let MongoDB expire these
  revokedAt: Date,
}
```

A TTL index on `expiresAt` means expired rows clean themselves up with no cron job.

Apply the rate limiter from [Spec 02 / S1](02-security-hardening.md) to `/refresh` as well.
It is an unauthenticated endpoint that performs a database lookup.

**Acceptance criteria**
- A valid refresh returns a new access token *and* a new refresh token.
- The presented refresh token is unusable afterward.
- Replaying a used refresh token revokes the whole family; every session for that user must
  re-login.
- Expired refresh rows disappear without manual cleanup.
- An access token still works for exactly its stated lifetime and no longer.

---

## A3 — Logout

**Value:** medium. **Effort:** low *after A2*, impossible before it. **Depends on:** A2.

**What**
`POST /api/auth/logout` — revoke the current refresh token. Optionally
`POST /api/auth/logout-all` to revoke every session for the user.

**Why**
There is no logout today, and no way to build one: a JWT is valid until it expires, so the
client can only discard its copy. That is not logout, it is forgetting. "Log out all
devices" after a password scare is impossible.

**Design**
Mark the token row revoked; for logout-all, revoke every row for the user. The access token
remains valid for its remaining lifetime — that residual window is the accepted cost of
stateless access tokens, and it is why A2 sets 15 minutes rather than an hour.

Do not build a denylist to close that window. It reintroduces a database lookup on every
request, which is the exact cost stateless tokens were chosen to avoid.

**Acceptance criteria**
- After logout, the refresh token is rejected.
- After logout-all, every refresh token for that user is rejected.
- Logging out one device does not affect another (except via logout-all).
- Logout is idempotent — a second call returns the same result, not an error.

---

## A4 — Change password

**Value:** medium. **Effort:** low. **Depends on:** A2 for the revocation half.

**What**
`PUT /api/auth/password`, authenticated, requiring the current password and a new one.

**Why**
A user who suspects compromise currently has no recourse whatsoever — no password change,
no reset, no logout. This is the smallest fix for that, and unlike A5 it needs no email
provider.

**Design**
Require the current password even though the request is authenticated; this is what stops
a stolen access token from becoming a permanent account takeover. Reuse the register
validation chain for the new password so the strength rules cannot drift between the two
endpoints.

On success, revoke all refresh tokens except the current session's. A password change
should end sessions the user no longer trusts — that is usually the reason they are
changing it.

**Acceptance criteria**
- A wrong current password returns 400 and changes nothing.
- The new password meets the same rules registration enforces.
- Old password stops working; new one works.
- Other sessions are logged out; the current one survives.

---

## A5 — Password reset

**Value:** high for real users. **Effort:** medium. **Shares a prerequisite with A6.**

**What**
`POST /api/auth/forgot-password` emails a reset link; `POST /api/auth/reset-password`
consumes the token and sets a new password.

**Design**
Single-use, short-lived token (15–60 min), stored hashed, invalidated on use and on any
successful login.

The response to `forgot-password` must be identical whether or not the address is
registered. Anything else turns the endpoint into a user-enumeration oracle and undoes
[Spec 02 / S3](02-security-hardening.md). Rate limit it per address as well as per IP —
otherwise it is a mail-bombing tool aimed at your own domain reputation.

Revoke all refresh tokens on reset. Unlike A4, there is no session to preserve.

**Prerequisite:** an email provider, shared with A6. Pick once. In development, write the
mail to the console instead of sending — the flow is testable without a provider account.

**Acceptance criteria**
- Identical response and timing for registered and unregistered addresses.
- The token works once and expires on schedule.
- Reset revokes every session.
- Rate limited per address and per IP.

---

## A6 — Email verification

**Value:** medium. **Effort:** medium. **Shares the email provider with A5.**

**What**
Email a verification link on registration; expose `GET /api/auth/verify/:token`.

**Why**
Registration accepts any well-formed string that looks like an address. Unverified
addresses mean password reset (A5) may be undeliverable precisely when it is needed, and
nothing stops signups against addresses the user does not control.

**Design**
Add `emailVerified: Boolean` to [models/User.js](../models/User.js). Decide deliberately
whether verification gates login or is merely advisory — gating is stricter but makes a
broken mail pipeline a total outage. Advisory is the right default for this project.

Include a resend endpoint, rate limited. Users lose the first mail routinely.

**Acceptance criteria**
- New users start unverified and receive a mail.
- The link verifies once; a reused or expired link fails cleanly.
- Resend is rate limited.
- Existing users are unaffected by the migration.

---

## A7 — Session listing

**Value:** low. **Effort:** low *given A2*. **Depends on:** A2, A3.

**What**
`GET /api/auth/sessions` lists active refresh tokens — created date, last used, user agent,
IP. `DELETE /api/auth/sessions/:id` revokes one.

**Why**
Nearly free once A2 stores session rows: add `userAgent` and `ip` columns and expose them.
It turns A3's blunt logout-all into something a user can act on precisely, and it is how
someone notices a session they do not recognise.

Never expose the token or its hash — only metadata.

**Acceptance criteria**
- Only the authenticated user's own sessions are listed.
- The current session is flagged as such.
- Revoking a listed session invalidates that refresh token and no other.
- No response field contains token material.

---

## Explicitly not recommended yet

- **OAuth / social login.** Real value, but it is a second identity system running beside
  the first — account linking, email collision, provider-specific edge cases. Not until
  A1–A4 are solid.
- **2FA / TOTP.** Meaningful only once password reset (A5) exists; otherwise it is a
  lockout generator with no recovery path.
- **Roles and permissions.** This app has exactly one relationship — a user owns their
  contacts. There is no second role to model. Adding RBAC now builds machinery for a
  requirement that does not exist.
