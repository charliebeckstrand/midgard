# `packages/ui` docs

Documentation for the `ui` package. Authoring conventions live in the repo-root
[`CONVENTIONS.md`](../../../CONVENTIONS.md); the package hub is
[`../REFERENCE.md`](../REFERENCE.md).

This folder holds three kinds of material. **Curated surface references** give
the always-current, quick-glance inventory of the public API. **Audits** record
point-in-time sweeps. **Plans** are dated design records for work in flight or
already shipped.

## Structure

- **Curated surface references** — one per public surface, kept current with the
  code: [`COMPONENTS.md`](COMPONENTS.md), [`LAYOUTS.md`](LAYOUTS.md), [`HOOKS.md`](HOOKS.md),
  [`PRIMITIVES.md`](PRIMITIVES.md), [`PROVIDERS.md`](PROVIDERS.md),
  [`RECIPES.md`](RECIPES.md), [`CORE.md`](CORE.md), [`UTILITIES.md`](UTILITIES.md).
  Each lists its surface for quick glance; every category but components carries a
  one-line summary per item. [`../REFERENCE.md`](../REFERENCE.md) is the hub that
  maps to them. Each one derives from the public API surface. When you add,
  remove, or rename an export, update the matching doc in the same change
  ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12).
- **`audits/`** — dated, full-surface sweeps of the package against a single
  lens (accessibility, correctness, API surface, documentation, …). Each audit
  records what the sweep found and how each finding closed. Delete it once the
  last finding closes ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12.4).
- **`plans/`** — dated design records: what a feature or module is trying to be,
  what ships today, and the increments still ahead. A plan holds the design; the
  owning `ROADMAP.md` tracks status. A plan stays as the historical record after
  its work lands.

New top-level subjects get their own folder here as they appear; keep
single-lens, point-in-time sweeps under `audits/` and design records under
`plans/`.

## Audit and plan naming

An audit file takes the name `{date}-{LENS}-AUDIT.md`, where:

- `{date}` is the ISO date (`YYYY-MM-DD`) of the sweep — the same date in the
  document's header. The prefix keeps the directory in chronological order. It
  also lets a later pass re-audit one lens without an overwrite of the prior
  one.
- `{LENS}` is the upper-case subject of the sweep: `ARIA`, `BUG`, `PROP`, etc.

A plan file follows the same convention as `{date}-{SUBJECT}-PLAN.md`. The
`{date}` is the ISO date of the draft, with the same prefix, so `plans/` stays
in chronological order. `{SUBJECT}` is the upper-case feature or module the
design covers (`GRID-EDITING`, `QUERY-MODULE`, …).

An audit is temporary and a plan is permanent; [`CONVENTIONS.md`](../../../CONVENTIONS.md)
§12.4 carries the lifecycle rule and its consequence for inbound references.
