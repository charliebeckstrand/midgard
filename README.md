# midgard

## 1. Quick start

This repository pins pnpm 12 in the `packageManager` field. Install pnpm 12 on your machine before you start.

```sh
npm install --global pnpm@12
pnpm install
pnpm dev
```

An older global pnpm delegates to pnpm 12 through its tools cache. Turbo cannot start the launcher at that path, so the pre-push hook fails. A global pnpm 12 avoids the delegation and the failure.

`pnpm dev` launches [`hlidskjalf`](https://www.npmjs.com/package/hlidskjalf), a terminal UI for monitoring the Turborepo dev tasks.

## 2. Commands

| Goal | Command |
|---|---|
| Build | `pnpm build` |
| Dev | `pnpm dev` |
| Typecheck | `pnpm check-types` |
| Lint | `pnpm lint` |
| Lint and fix | `pnpm lint:fix` |
| Tests | `pnpm test` |
| The pre-push gate: Biome, typecheck, the tests that the branch changes, the workspace tests, and Knip | `pnpm check` |

## 3. Workspaces

| Path | Role |
|---|---|
| [`apps/admin`](apps/admin/README.md) | Next.js admin app (App Router, Turbopack). |
| [`apps/places`](apps/places/README.md) | Next.js map of the places you have been (App Router, Turbopack). |
| [`apps/picks`](apps/picks/README.md) | Next.js picks of the NFL winners, week by week (App Router, Turbopack). |
| [`apps/elections`](apps/elections/README.md) | Next.js election results by state, district, and county, from civicAPI (App Router, Turbopack). |
| [`apps/numbers`](apps/numbers/README.md) | Next.js number game: put 20 random numbers in ascending order (App Router, Turbopack). |
| [`packages/ui`](packages/ui/README.md) | Design system: components, primitives, hooks, providers, recipes. |
| [`packages/auth`](packages/auth/README.md) | Auth library: config, proxy, user. |
| [`packages/shared`](packages/shared/README.md) | Shared auth UI and the global stylesheet. |

## 4. Stack

| Layer | Tool |
|---|---|
| Library | [React](https://react.dev) |
| Framework | [Next.js](https://nextjs.org/docs/app) |
| CSS | [Tailwind CSS](https://tailwindcss.com/docs) |
| Design system | [UI](packages/ui) |
| Testing | [Vitest](https://vitest.dev) |
| Build | [Turborepo](https://turborepo.dev/docs) |
| Formatter / linter | [Biome](https://biomejs.dev) |
| Git hooks | [Lefthook](https://lefthook.dev) |
| CI | [GitHub Actions](https://docs.github.com/actions) |
| Package manager | [pnpm](https://pnpm.io) |

The design system has its own hub, [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md).

## 5. Gateway

Each app except elections gets auth and API responses from the bifrost gateway. The elections app is public, so it has no gateway, no `withAuth`, and no proxy. Sign-in is optional in the numbers app, so its proxy gates no route. [`withAuth`](packages/auth/README.md) rewrites the same-origin `/auth/*` and `/api/*` paths to the gateway, and the typed `bifrost` client fetches from it. The types come from the OpenAPI spec that the gateway commits (`pnpm --filter auth openapi`). [`packages/auth/src/env.ts`](packages/auth/src/env.ts) reads the origin from `BIFROST_URL`, and no other file reads it.

| Environment | `BIFROST_URL` |
|---|---|
| Development | Not set. The value defaults to `http://localhost:4000`. |
| Production | `https://auth.ivoryimage.dev`. The gateway serves `/auth/*` and `/api/*` at the root of that origin. |

`next build` writes the value into the rewrites, so set it for the build and for the server. In production, a build or a server start without it fails.

The gateway rate-limits sign-in and register by client address. On App Platform, each hop writes its own address into `do-connecting-ip`, so the gateway sees the address of the app. The proxy of each app behind the gateway sends the address of the browser in `x-client-ip`, with `CLIENT_IP_SECRET` in `x-client-ip-secret`. The gateway uses that address only when the secret agrees with its own `CLIENT_IP_SECRET`. Set the same value in the `CLIENT_IP_SECRET` repository secret of midgard and of asgard. In production, such an app without the secret fails each request, and its health check stops the deploy.

## 6. Deploy

Each push to `main` runs [`deploy.yml`](.github/workflows/deploy.yml). It builds an image of each component, tagged with the commit SHA, and pushes it to the GitHub container registry as `ghcr.io/charliebeckstrand/midgard-<component>`. CI runs at the same time. When CI and each image pass, the workflow applies the App Platform spec in [`.do/app.yaml`](.do/app.yaml) with that tag, so the app runs the commit that CI checked. App Platform pulls each image with no credentials, so each package must be public. GitHub makes a new package private, so a new component needs its package made public in the package settings after its first push. The spec holds one app, `midgard`, with one component for each subdomain:

| Subdomain | Component | Build |
|---|---|---|
| `admin.ivoryimage.dev` | `apps/admin` | [`Dockerfile`](Dockerfile), with `APP=admin` |
| `places.ivoryimage.dev` | `apps/places` | [`Dockerfile`](Dockerfile), with `APP=places` |
| `elections.ivoryimage.dev` | `apps/elections` | [`Dockerfile`](Dockerfile), with `APP=elections` |
| `numbers.ivoryimage.dev` | `apps/numbers` | [`Dockerfile`](Dockerfile), with `APP=numbers` |
| `docs.ivoryimage.dev` | The docs site of `ui`, served in the language of the reader | [`Dockerfile.docs`](Dockerfile.docs) |

The registry keeps each image, so that an earlier commit can go live again. The Next apps build with `output: 'standalone'`. To build one image locally:

```sh
docker build --build-arg APP=admin --build-arg BIFROST_URL=https://auth.ivoryimage.dev .
docker build --file Dockerfile.docs .
```

The DigitalOcean MCP server in [`.mcp.json`](.mcp.json) reads the state and the logs of the app. It is off by default, because it needs a DigitalOcean token, and a cloud session has no token. To use it on your machine, set `DIGITALOCEAN_API_TOKEN`, then approve the server when Claude Code asks, or turn it on in `/mcp`. The deny rules in [`.claude/settings.json`](.claude/settings.json) block the tools that change the app (CLAUDE.md §3.8).

---

**See also:** [CLAUDE.md](CLAUDE.md), [CONVENTIONS.md](CONVENTIONS.md), [STE.md](STE.md).
