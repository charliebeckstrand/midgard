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
| `app/(signed-in)/` | Pages of each signed-in user. `requireSession` in its layout sends everyone else to `/login`. The layout picks the chrome by the role: an admin gets the sidebar, and each other user gets a header. The chrome stays mounted between the pages of the group, and when the second step passes. |
| `app/(signed-in)/(dashboard)/*` | Admin-only product surface (dashboard, security, settings, users). `requireAdmin` in its layout sends a signed-in user that is not an admin to `/account`, and an admin without the second step to `/verify`. |
| `app/(signed-in)/account/` | Account page of each signed-in user: two-step sign-in (passkeys, an authenticator app, and recovery codes), the connected GitHub and Google accounts, and the recent activity. The account menu of the chrome holds sign-out. |
| `app/components/page-header/` | The title row of each signed-in page: the title, the breadcrumb, the description, and the actions. |
| `app/(guest)/login/`, `app/(guest)/register/` | Sign-in and registration pages. The sign-in page shows a button for each GitHub or Google sign-in that the gateway has set up. The layout of the group sends a signed-in admin to `/`, and another signed-in user to `/account`. |
| `app/<segment>/client.tsx` | Interactive client subtree split from the segment's server `page.tsx` ([CONVENTIONS](../../CONVENTIONS.md) §2.3). |
| `app/providers.tsx` | Top-level React Context providers. |
| `proxy.ts` | Session gate. It re-exports [`auth/proxy`](../../packages/auth/README.md), and its `matcher` leaves `/auth/*` open. |

## 4. Environment

`BIFROST_URL` is the origin of the gateway. Copy [`.env.example`](.env.example) to `.env.local` for development, where the value defaults to `http://localhost:4000`. Production uses `https://auth.ivoryimage.dev`. See [CONVENTIONS](../../CONVENTIONS.md) §11.

## 5. Dependencies

Consumes the design system ([`ui`](../../packages/ui/README.md)), the auth pages and the global stylesheet ([`shared`](../../packages/shared/README.md)), and the auth library ([`auth`](../../packages/auth/README.md)).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
