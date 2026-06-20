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
| `app/(dashboard)/*` | Authenticated product surface (dashboard, settings, users). |
| `app/login/`, `app/register/` | Unauthenticated sign-in and registration pages. |
| `app/<segment>/client.tsx` | Interactive client subtree split from the segment's server `page.tsx` ([CONVENTIONS](../../CONVENTIONS.md) §2.3). |
| `app/providers.tsx` | Top-level React Context providers. |
| `proxy.ts` | Same-origin proxy to the gateway; re-exports [`auth/proxy`](../../packages/auth/README.md). |

## 4. Environment

See ([CONVENTIONS](../../CONVENTIONS.md) §11).

## 5. Dependencies

Consumes the design system ([`ui`](../../packages/ui/README.md)), shared utilities ([`shared`](../../packages/shared/README.md)), and the auth library ([`auth`](../../packages/auth/README.md)).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
