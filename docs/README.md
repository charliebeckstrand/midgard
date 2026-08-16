# `docs`

> **Repository-level documentation that no single workspace owns.** A package keeps its own documentation beside its code — the design system's lives in [`packages/ui/docs`](../packages/ui/docs/README.md). This folder holds the material that spans the repository, or that comes before any workspace exists.

## Structure

- **[`potential/`](potential/README.md)** — briefs for apps that this repository could hold. A brief records an idea that nobody has approved, so the idea survives the conversation that produced it.

New top-level subjects get their own folder here as they appear. Keep a folder's own `README.md` current with what the folder holds.

## What does not live here

A workspace documents itself. An app's README states how to run it and what it is; a package's README states what it exports. Do not lift either into this folder.

A design record for work in flight belongs to the package that the work changes. The design system keeps those under [`packages/ui/docs/plans`](../packages/ui/docs/plans), and its point-in-time sweeps under [`packages/ui/docs/audits`](../packages/ui/docs/audits) ([`CONVENTIONS.md`](../CONVENTIONS.md) §12.3).

---

**See also:** [`../README.md`](../README.md) · [`../CONVENTIONS.md`](../CONVENTIONS.md) §12 · [`../CADENCE.md`](../CADENCE.md) · [`../STE.md`](../STE.md).
