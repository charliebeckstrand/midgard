# `packages/ui` docs

Long-form documentation for the `ui` package. Authoring conventions and the
component/hook/primitive inventory live one level up, in
[`../REFERENCE.md`](../REFERENCE.md) and the repo-root
[`CONVENTIONS.md`](../../../CONVENTIONS.md); this folder holds the material that
doesn't belong in either — audits, design notes, and investigations that record
a point-in-time assessment of the package.

## Structure

- **`audits/`** — dated, full-surface sweeps of the package against a single
  lens (accessibility, correctness, API surface, …). Each audit is a standalone
  record of what was found and, where applicable, what was resolved.

New top-level subjects get their own folder here as they appear; keep
single-lens, point-in-time sweeps under `audits/`.

## Audit naming

Audit files are named `{date}-{LENS}-AUDIT.md`, where:

- `{date}` is the ISO date (`YYYY-MM-DD`) the audit was performed — the same
  date recorded in the document's header. The prefix keeps the directory sorted
  chronologically and lets a lens be re-audited later without overwriting the
  prior pass.
- `{LENS}` is the upper-case subject of the sweep: `ARIA`, `BUG`, `PROP`, etc.

Current audits:

| File | Lens |
|---|---|
| `audits/2026-06-08-ARIA-AUDIT.md` | WAI-ARIA / APG conformance |
| `audits/2026-06-10-BUG-AUDIT.md` | Logic, React correctness, races, leaks, SSR |
| `audits/2026-06-13-PROP-AUDIT.md` | Component prop API gaps |

An audit is a living record: as findings are resolved, mark the row or pattern
resolved in place (with the resolving commit) rather than deleting it, so the
document keeps its history.
