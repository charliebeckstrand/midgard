# `packages/ui` docs

Documentation for the `ui` package. Authoring conventions live in the repo-root
[`CONVENTIONS.md`](../../../CONVENTIONS.md); the package hub is
[`../REFERENCE.md`](../REFERENCE.md).

This folder holds four kinds of material. **Curated surface references** give
the always-current, quick-glance inventory of the package. The **quality
ledger** holds the state of each unit. **Audits** and **plans** are temporary
records, which a later step deletes.

## Structure

- **Curated surface references** — kept current with the code:
  [`COMPONENTS.md`](COMPONENTS.md), [`MODULES.md`](MODULES.md),
  [`STRUCTURE.md`](STRUCTURE.md), [`LAYOUTS.md`](LAYOUTS.md), [`HOOKS.md`](HOOKS.md),
  [`PRIMITIVES.md`](PRIMITIVES.md), [`PROVIDERS.md`](PROVIDERS.md),
  [`CORE.md`](CORE.md) index the public surface, and [`RECIPES.md`](RECIPES.md)
  and [`UTILITIES.md`](UTILITIES.md) index the package-internal layers. Each
  category but components carries a one-line summary for each item.
  [`../REFERENCE.md`](../REFERENCE.md) is the hub that maps to them. When you
  add, remove, or rename an export, update the matching doc in the same change
  ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12.2).
- **Quality ledger** — [`LEDGER.md`](LEDGER.md) holds one row for each unit, with
  its state against the definition of done ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12.6).
- **`audits/`** — dated sweeps of one area or one lens. Each audit records what
  the sweep found and the pull request that closed each finding. Delete it once
  the last finding closes ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12.3, §12.4).
- **`plans/`** — dated design records. Each plan records one decision: what a
  feature or module must be, and the increments that make it. The pull requests
  that carry the work hold its progress, and the plan holds none. Delete it once
  its last step lands ([`CONVENTIONS.md`](../../../CONVENTIONS.md) §12.5).

New top-level subjects get their own folder here as they appear.

[`CONVENTIONS.md`](../../../CONVENTIONS.md) §12.3 and §12.5 give the file names
of an audit and a plan. Never name an audit or a plan from code, or from a
document that outlives it.
