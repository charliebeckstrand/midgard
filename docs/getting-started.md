# Getting Started

A guide to setting up Midgard for local development.

## Prerequisites

- **Node.js 22+** — Required by the hlidskjalf terminal dashboard
- **pnpm 10+** — Package manager ([install guide](https://pnpm.io/installation))
- **Git** — Version control

## Clone & Install

```sh
git clone <repo-url> midgard
cd midgard
pnpm install
```

## Environment Variables

Each app that uses authentication needs a `BIFROST_URL` pointing to the auth backend. Create a `.env.local` file in each app directory that needs it:

```sh
# apps/admin/.env.local
# apps/chat/.env.local
BIFROST_URL=http://localhost:4000
```

## Start the Dev Server

```sh
pnpm dev
```

This launches **hlidskjalf**, a terminal dashboard that discovers all workspace packages and starts them in dev mode simultaneously. You'll see a live status table showing each process:

| App    | URL                    |
| ------ | ---------------------- |
| Admin  | http://localhost:3000  |
| Chat   | http://localhost:3001  |

Shared packages (ui, heimdall, sindri, reactbits) also run in watch mode so changes propagate automatically.

### Running a Single App

If you only need one app:

```sh
pnpm --filter admin dev    # Just the admin app
pnpm --filter chat dev     # Just the chat app
```

Note: shared packages won't rebuild automatically in this mode. Use `pnpm dev` for the full experience.

## Verify Your Setup

1. Run `pnpm dev` and wait for all processes to show "ready"
2. Open http://localhost:3000 — the admin app should redirect to `/login`
3. Run `pnpm check-types` to verify TypeScript is configured correctly
4. Run `pnpm lint` to verify Biome is working

## Next Steps

- Read [Development Workflow](#development) for day-to-day tasks
- Read [Architecture Overview](#architecture) to understand the system design
