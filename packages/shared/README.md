# shared

Cross-app utilities and CSS.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

| Path | Purpose |
|---|---|
| `shared/auth` | App-level auth helpers built on `auth`. |
| `shared/chat` | Chat client utilities (event-stream parser, textarea autosize wiring). |
| `shared/theme.css` | Theme tokens. |
| `shared/globals.css` | Global resets and base styles. |

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm --filter shared build` |
| Watch build | `pnpm --filter shared dev` |
| Lint | `pnpm --filter shared lint` |
| Format | `pnpm --filter shared format` |

## 3. Consumers

Used by [`apps/admin`](../../apps/admin/README.md). Depends on [`auth`](../auth/README.md) and [`ui`](../ui/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
