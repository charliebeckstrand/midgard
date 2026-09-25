# shared

Cross-app auth and chat UI, plus CSS themes.

## 0. Prerequisites

Peer-compatible with Next 15–16 and React 18–19.

## 1. Exports

| Path | Purpose |
|---|---|
| `shared/auth` | Auth UI: `LoginPage`, `RegisterPage`. They post to the same-origin `/auth/*` paths, which `withAuth` rewrites to the gateway. |
| `shared/chat` | Chat client: `ChatTranscript`, `useChat` / `useSendMessage` (SSE stream parser), `Chat` / `ChatContent` types. |
| `shared/theme.css` | Theme tokens. |
| `shared/globals.css` | Global resets and base styles. |

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm --filter shared build` |
| Watch build | `pnpm --filter shared dev` |
| Test | `pnpm --filter shared test` |
| Lint | `pnpm --filter shared lint` |
| Format | `pnpm --filter shared format` |

## 3. Consumers

Used by [`apps/admin`](../../apps/admin/README.md). Depends on [`ui`](../ui/README.md).

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md).
