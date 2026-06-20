# `packages/ui` docs

Documentation for the `ui` package. Authoring conventions live in the repo-root
[`CONVENTIONS.md`](../../../CONVENTIONS.md); the package hub is
[`../REFERENCE.md`](../REFERENCE.md). This folder holds two kinds of material:
**curated surface references** (the always-current, quick-glance inventory of
the public API) and **audits** (point-in-time sweeps).

## Structure

- **Curated surface references** — one per public surface, kept current with the
  code: [`COMPONENTS.md`](COMPONENTS.md), [`LAYOUTS.md`](LAYOUTS.md), [`HOOKS.md`](HOOKS.md),
  [`PRIMITIVES.md`](PRIMITIVES.md), [`PROVIDERS.md`](PROVIDERS.md),
  [`RECIPES.md`](RECIPES.md), [`CORE.md`](CORE.md), [`UTILITIES.md`](UTILITIES.md).
  Each lists its surface for quick glance; every category but components carries a
  one-line summary per item. [`../REFERENCE.md`](../REFERENCE.md) is the hub that
  maps to them. These are derived from the public API surface — when an export
  is added, removed, or renamed, update the matching doc in the same change
  ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12).
- **`audits/`** — dated, full-surface sweeps of the package against a single
  lens (accessibility, correctness, API surface, documentation, …). Each audit is
  a standalone record of what was found and, where applicable, what was resolved.

New top-level subjects get their own folder here as they appear; keep
single-lens, point-in-time sweeps under `audits/`.

## Audit naming

Audit files are named `{date}-{LENS}-AUDIT.md`, where:

- `{date}` is the ISO date (`YYYY-MM-DD`) the audit was performed — the same
  date recorded in the document's header. The prefix keeps the directory sorted
  chronologically and lets a lens be re-audited later without overwriting the
  prior pass.
- `{LENS}` is the upper-case subject of the sweep: `ARIA`, `BUG`, `PROP`, etc.

An audit is a living record: as findings are resolved, mark the row or pattern
resolved in place (with the resolving commit) rather than deleting it, so the
document keeps its history.
