# admin

## 1. Quick start

```sh
pnpm install
pnpm --filter admin dev
```

## 2. Commands

| Goal | Command |
|---|---|
| Dev (Turbopack) | `pnpm --filter admin dev` |
| Build | `pnpm --filter admin build` |
| Start (production) | `pnpm --filter admin start` |
| Typecheck | `pnpm --filter admin check-types` |
| Lint | `pnpm --filter admin lint` |

## 3. Layout

| Path | Role |
|---|---|
| `app/(app)/*` | Authenticated product surface. |
| `app/(auth)/*` | Sign-in. |
| `app/providers.tsx` | Top-level React Context providers. |
| `app/api/[...path]/*` | Same-origin proxy to the gateway. |
| `src/components/<name>/` | App-local components; route-specific UI co-locates with the owning segment. |

## 4. Environment

See ([CONVENTIONS](../../CONVENTIONS.md) §12).

## 5. Dependencies

Consumes the design system ([`ui`](../../packages/ui/README.md)), shared utilities ([`shared`](../../packages/shared/README.md)), and the auth library ([`auth`](../../packages/auth/README.md)).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
