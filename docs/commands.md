# Commands

Useful commands and workflows for the Midgard monorepo.

## Start all apps and packages in dev mode

```sh
pnpm dev
```

## Production build (all packages via Turbo)

```sh
pnpm build
```

## Check formatting and lint rules

```sh
pnpm lint
```

## Auto-fix formatting and lint issues

```sh
pnpm lint:fix
```

## TypeScript type checking across the workspace

```sh
pnpm check-types
```

## Start the UI component showcase (port 3456)

```sh
pnpm --filter ui docs
```

Runs the Vite-powered component showcase at `packages/ui/src/docs/`. Useful when building or reviewing UI components without running the full app stack.
