# Spec 06 — Contacts Features

New capability for the contacts resource. F1 and F2 are the gaps that make the current API
incomplete rather than merely minimal — everything after them is genuine product work.

Style reminder: CommonJS, no semicolons, single quotes, 2-space indent, trailing commas.
Every new per-contact route repeats the ownership guard described in
[CLAUDE.md](../CLAUDE.md) — or its single-query replacement from
[Spec 03 / D2](03-design-and-performance.md), if that has landed.

---

## F1 — `GET /api/contacts/:id`

**Value:** high. **Effort:** trivial.

**What**
There is no read-one endpoint. [routes/contacts.js](../routes/contacts.js) declares GET
(list), POST, PUT, and DELETE — the "R" in CRUD only exists in bulk form.

**Why**
Any client with a contact detail page has to fetch the entire list and filter client-side,
which gets worse with every contact added and breaks outright once pagination (F3) lands
and the target is not on page one. It is also the natural verification endpoint after a
PUT.

**Design**
Same three-step ownership guard as update and delete. Roughly ten lines, and it makes the
resource coherent.

**Acceptance criteria**
- Returns the contact when the caller owns it.
- Returns 404 for an unknown id, and for another user's contact — matching whatever
  existence-disclosure stance D2 settled on.
- A malformed id returns 400, per [Spec 01 / C2](01-correctness-bugs.md).

---

## F2 — Search and filter

**Value:** high. **Effort:** low-medium.

**What**
Query parameters on the list endpoint: `?search=` across name/email/phone, `?type=` to
filter by category.

**Why**
This is a contact keeper. Search is not an enhancement, it is the primary interaction once
a user passes about thirty contacts. Without it the client must load everything and filter
in the browser.

**Design**
Build the Mongo filter from whitelisted params, always anchored to `user: req.user.id` —
the ownership scope is not optional and must not be assembled from user input.

For `search`, start with a case-insensitive regex across the three fields. Be aware of what
that costs: a leading-wildcard regex cannot use an index, so it degrades into a scan of
that user's documents. Acceptable at a few hundred contacts per user, not at scale. A
MongoDB text index is the upgrade path; do not reach for it until the regex is
demonstrably too slow, because a text index brings its own constraints (one per collection,
no partial-word matching).

Escape regex metacharacters in the search term. An unescaped `(` returns a 500, and a
pathological pattern is a denial-of-service vector.

Validate query params in the route, same as body params — that convention should hold for
every input, not just bodies.

**Acceptance criteria**
- `?search=` matches case-insensitively across name, email, and phone.
- `?type=` filters to valid enum values only; an invalid value returns 400.
- Filters compose.
- Search never returns another user's contacts.
- A search term of `((` returns results or 400, never 500.

---

## F3 — Pagination and sorting

**Value:** high. **Effort:** low.

**What**
`?page=`, `?limit=`, `?sort=` on the list endpoint, with pagination metadata in the
response.

**Why**
`getContacts` in [controllers/contactsController.js](../controllers/contactsController.js)
returns every contact the user owns, unbounded, in one response. That is fine at fifty and
a problem at five thousand — for the database, the network, and the client rendering it.
Sorting is currently hardcoded to `date: -1`; alphabetical is the more common expectation
for a contacts list.

**Design**
Cap `limit` at a hard maximum (say 100) and default it (say 20). An uncapped `limit` is
just the current unbounded behaviour behind a parameter.

Whitelist sortable fields — `name`, `date`, `type`. Passing user input straight into
`.sort()` lets a caller sort by any indexed or unindexed path and is a cheap way to force
expensive queries.

Return metadata alongside the rows, not bare:

```js
{ contacts: [...], page: 1, limit: 20, total: 137, pages: 7 }
```

This changes the response shape of an existing endpoint. It is a breaking change for any
client already consuming the bare array. Do it now, while the React client still uses
in-memory data and does not read this endpoint, rather than later.

Pairs directly with the compound index in [Spec 03 / D1](03-design-and-performance.md):
`{ user: 1, date: -1 }` serves the default sort. Sorting by `name` wants its own index
once it is a common path.

Note that skip-based pagination degrades on deep pages, since MongoDB walks and discards
every skipped document. Irrelevant at this scale; cursor pagination is the answer if it
ever is not.

**Acceptance criteria**
- Default page size applies when no params are given.
- `limit=10000` is clamped, not honoured.
- An unlisted sort field returns 400.
- Page + limit + search + type all compose correctly, and `total` reflects the filters.

---

## F4 — Richer contact model

**Value:** medium. **Effort:** medium — schema migration.

**What**
Move beyond one email, one phone, and a two-value `type`. Add notes, address, company,
job title, birthday; allow multiple labelled phones and emails; replace or supplement
`type` with free-form tags.

**Why**
The current model cannot represent a person with a work phone and a mobile — the most
ordinary fact about a contact. The `personal`/`professional` binary is similarly thin; real
contacts belong to several overlapping groups.

**Design**
Multiple values means subdocuments: `phones: [{ label, value }]`. This is the point where
the API stops being a flat key-value store, so it is worth deciding deliberately rather
than accreting fields one at a time.

A migration path that avoids a breaking change: keep `phone` and `email` as the primary
values, add `additionalPhones` / `additionalEmails` alongside. Less elegant than a clean
array, and it keeps every existing client working. Choose consciously — the clean version
is genuinely better if you are willing to migrate.

Tags replacing `type` interacts with F2's `?type=` filter and D4's enum. Decide whether
tags supplement `type` or replace it before implementing either.

**Acceptance criteria**
- Existing contacts keep working with no data migration, or a migration script is included.
- New fields are optional; a minimal `{ name }` contact is still valid.
- Validation covers new fields in routes, per the layering rule.

---

## F5 — CSV import and export

**Value:** medium-high for this app specifically. **Effort:** medium.

**What**
`GET /api/contacts/export` returns CSV; `POST /api/contacts/import` accepts an uploaded
file.

**Why**
This is the feature that makes a contact keeper adoptable — nobody types in two hundred
contacts by hand. It is also the one that lets users leave, which is worth building anyway.
Every mail client and phone exports contacts as CSV or vCard.

**Design**
Import is the hard half:

- **Streaming, not buffering.** Parse as a stream and reject oversized uploads at the
  boundary, or a large file becomes a memory-exhaustion vector.
- **Partial success.** Row 400 of 500 will be malformed. Decide up front: reject the whole
  file, or import what parses and return a per-row error report. The report is friendlier
  and the only workable option at scale.
- **Duplicates.** Define the rule — skip, overwrite, or create anyway — before writing the
  parser, because it determines the whole shape.
- **Ownership.** Every imported row gets `user: req.user.id`, ignoring any user column in
  the file entirely. Treat the file as hostile input.
- **Rate limiting.** Import is expensive. It needs its own limit.

Export is straightforward, but stream it rather than building the string in memory, and set
`Content-Disposition` so clients save it with a filename.

vCard is the better format for phone interoperability and a reasonable follow-on. CSV
first — it is what spreadsheets speak.

**Acceptance criteria**
- Export round-trips through import with no data loss.
- A malformed row is reported by row number and does not abort the import.
- Oversized uploads are rejected before parsing.
- No import can write a contact owned by another user.

---

## F6 — Favourites

**Value:** medium. **Effort:** trivial.

**What**
A `favorite: Boolean` field, a `?favorite=true` filter, and a toggle endpoint.

**Why**
Best value-to-effort ratio in this spec. One indexed boolean, and the list becomes usable
without search for the handful of contacts anyone actually reaches for.

**Design**
A dedicated `PATCH /api/contacts/:id/favorite` rather than routing it through the general
update — it is a one-field toggle from a single tap, and it keeps the client from sending a
full-document PUT for one boolean.

**Acceptance criteria**
- Toggling persists and is reflected in the list.
- `?favorite=true` composes with search, type, and pagination.
- Defaults to false for existing and new contacts.

---

## F7 — Soft delete and restore

**Value:** medium. **Effort:** medium — touches every query.

**What**
`deletedAt` instead of a hard delete, a trash listing, restore, and permanent delete.

**Why**
Deletion is currently immediate and irreversible. There is no undo for a misplaced tap.

**Design**
The cost is not the delete — it is that **every existing query must now exclude deleted
rows**, and the failure mode is silent: miss one and deleted contacts reappear. A Mongoose
query middleware hook that injects `deletedAt: null` centrally is far safer than
remembering the filter at each call site, though it makes the queries less explicit to read.

Add `deletedAt` to the compound index from D1, or every list query starts filtering on an
unindexed field and undoes that work.

Auto-purge after a retention window with a TTL index — otherwise trash grows forever.

**Acceptance criteria**
- Deleted contacts vanish from every list, search, and read-one path.
- Trash lists only the caller's deleted contacts.
- Restore returns the contact intact.
- Purge after the retention window is automatic.

---

## F8 — Bulk operations

**Value:** low-medium. **Effort:** low. **Best after F7.**

**What**
`POST /api/contacts/bulk-delete` and bulk tag/type updates, taking an array of ids.

**Why**
Selecting twenty contacts and deleting them one request at a time is twenty round-trips.
Natural companion to import (F5), which is how someone ends up with twenty contacts they
want gone.

**Design**
Ownership is enforced in the query filter — `{ _id: { $in: ids }, user: req.user.id }` —
never by checking ids in a loop. Cap the array length; an unbounded `$in` is a
denial-of-service vector.

Report how many of the submitted ids were actually affected. Silent partial success on a
bulk delete is confusing precisely when it matters.

**Acceptance criteria**
- Only the caller's contacts are affected, even if the array contains others' ids.
- The response states how many were modified versus submitted.
- An oversized array returns 400.
- A malformed id in the array does not 500 the request.
