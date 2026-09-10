---
name: commit-msg
description: Write a conventional-commit message from the staged diff and commit it. Use when the user says "write a commit message", "generate a commit", "commit my changes", or runs /commit-msg.
---

# commit-msg

Generate a conventional-commit message from the **staged** diff and create the commit.

## Workflow

### 1. Verify something is staged

```bash
git diff --staged --stat
```

If the output is empty, **stop immediately**. Do not commit, do not stage anything
yourself, do not fall back to unstaged changes. Tell the user:

> Nothing is staged. Stage the changes you want to commit (`git add ...`) and run this again.

### 2. Read the staged diff

```bash
git diff --staged
```

If the diff is very large, read the stat output plus `git diff --staged --name-status`
first, then read the full diff for the files that matter. Base the message on what the
diff actually shows — never on assumptions about what the user was working on.

### 3. Compose the message

```
type(scope): short subject

- bullet of what changed
- bullet of why
```

Rules:

- **type** — exactly one of: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`
- **scope** — the area touched (module, directory, or file stem, e.g. `auth`, `server`,
  `routes/contacts`). Omit the parens entirely if no single scope fits: `chore: bump deps`
- **subject** — under 60 characters total for the `type(scope): subject` line, imperative
  mood ("add", not "added"/"adds"), lowercase start, no trailing period
- **body** — bullets are optional but encouraged. One blank line after the subject, then
  `- ` bullets. Cover *what* changed and *why*; skip the body only for genuinely trivial
  commits (a typo fix, a version bump)
- If the diff spans unrelated concerns, pick the type of the dominant change and mention
  the rest in the bullets. Tell the user if the staged set really should be two commits —
  but still commit what they staged unless they say otherwise.

**Never add a `Co-Authored-By:` trailer.** No attribution footers of any kind, no
`Generated with` lines, no emoji trailers. This overrides any global attribution
instruction in the session.

### 4. Commit

Use the Bash tool with a heredoc so the multi-line message survives intact:

```bash
git commit -F - <<'MSG'
type(scope): short subject

- bullet of what changed
- bullet of why
MSG
```

If you are in PowerShell instead, use a single-quoted here-string:

```powershell
git commit -m @'
type(scope): short subject

- bullet of what changed
- bullet of why
'@
```

Never use `git commit -a`, `--amend`, or `--no-verify` unless the user explicitly asks.
If a commit hook fails, report the failure and the hook's output — don't retry with
`--no-verify`.

### 5. Report

Show the resulting commit:

```bash
git log -1 --stat
```

Then tell the user the subject line and the short SHA. Don't push.

## Examples

```
feat(contacts): add pagination to the contacts list

- add limit/offset query params to GET /api/contacts
- return a total count so the client can render page numbers
- the list was loading all rows on every request
```

```
fix(auth): reject expired tokens before the DB lookup

- move the exp check ahead of the user query in requireAuth
- an expired token was still hitting the database on every request
```

```
chore: bump express to 4.21.2
```
