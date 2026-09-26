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

## 3. Workspaces

| Path | Role |
|---|---|
| [`apps/admin`](apps/admin/README.md) | Next.js admin app (App Router, Turbopack). |
| [`apps/places`](apps/places/README.md) | Next.js map of the places you have been (App Router, Turbopack). |
| [`packages/ui`](packages/ui/README.md) | Design system: components, primitives, hooks, providers, recipes. |
| [`packages/auth`](packages/auth/README.md) | Auth library: config, proxy, user. |
| [`packages/shared`](packages/shared/README.md) | Shared auth UI and the global stylesheet. |

## 4. Gateway

Both apps get auth and API responses from the bifrost gateway. [`withAuth`](packages/auth/README.md) rewrites the same-origin `/auth/*` and `/api/*` paths to the gateway, and `bifrost()` fetches from it on the server. [`packages/auth/src/env.ts`](packages/auth/src/env.ts) reads the origin from `BIFROST_URL`, and no other file reads it.

| Environment | `BIFROST_URL` |
|---|---|
| Development | Not set. The value defaults to `http://localhost:4000`. |
| Production | `https://auth.ivoryimage.dev`. The gateway serves `/auth/*` and `/api/*` at the root of that origin. |

`next build` writes the value into the rewrites, so set it for the build and for the server. In production, a build or a server start without it fails.

The gateway rate-limits sign-in and register by client address. On App Platform, each hop writes its own address into `do-connecting-ip`, so the gateway sees the address of the app. The proxy of each app sends the address of the browser in `x-client-ip`, with `CLIENT_IP_SECRET` in `x-client-ip-secret`. The gateway uses that address only when the secret agrees with its own `CLIENT_IP_SECRET`. Set the same value in the `CLIENT_IP_SECRET` repository secret of midgard and of asgard. In production, an app without the secret fails each request, and its health check stops the deploy.

## 5. Deploy

Each push to `main` runs [`deploy.yml`](.github/workflows/deploy.yml). It runs CI, then applies the App Platform spec in [`.do/app.yaml`](.do/app.yaml). The spec holds one app, `midgard`, with one component for each subdomain:

| Subdomain | Component | Build |
|---|---|---|
| `admin.ivoryimage.dev` | `apps/admin` | [`Dockerfile`](Dockerfile), with `APP=admin` |
| `places.ivoryimage.dev` | `apps/places` | [`Dockerfile`](Dockerfile), with `APP=places` |
| `docs.ivoryimage.dev` | The docs site of `ui`, a static site | [`Dockerfile.docs`](Dockerfile.docs) |

The Next apps build with `output: 'standalone'`. To build one image locally:

```sh
docker build --build-arg APP=admin --build-arg BIFROST_URL=https://auth.ivoryimage.dev .
docker build --file Dockerfile.docs .
```

---

**See also:** [CLAUDE.md](CLAUDE.md), [CONVENTIONS.md](CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
