# Development Workflow

Day-to-day development patterns and common tasks.

## Code Style

Formatting is handled by **Biome** and enforced by a pre-commit hook. You don't need to think about it — just save your files.

- **Tabs** for indentation
- **Single quotes**
- **No semicolons**
- **100-character line width**

Configure your editor to use Biome as the default formatter. VS Code settings are included in the repo (`.vscode/settings.json`).

## Common Commands

```sh
pnpm dev            # Start all apps and packages in dev mode
pnpm build          # Production build (all packages via Turbo)
pnpm lint           # Check formatting and lint rules
pnpm lint:fix       # Auto-fix formatting and lint issues
pnpm check-types    # TypeScript type checking across the workspace
pnpm --filter ui docs  # Start the UI component showcase on port 3456
```

## UI Component Showcase

The `packages/ui` package includes a standalone Vite app for browsing and developing components in isolation. Start it with:

```sh
pnpm --filter ui docs
```

It runs on **port 3456** and hot-reloads as you edit component or demo files.

**Adding a new demo:** Create a file in `packages/ui/src/docs/demos/`. Each file must export:

- A **default React component** — the rendered demo
- An optional **`meta` object** — `{ name: string, category: string }` used for the sidebar label and grouping

```ts
// packages/ui/src/docs/demos/my-component.tsx
export const meta = { name: 'MyComponent', category: 'Forms' }
export default function MyComponentDemo() {
  return <MyComponent />
}
```

No other files need touching — the app auto-discovers demos via `import.meta.glob`. Categories in use: Forms, Data Display, Feedback, Overlay, Navigation, Layout.

## Adding a New App

1. Copy the structure of `apps/admin` as a starting point
2. Update `package.json` with the new app name and dependencies
3. Create `tsconfig.json` extending `../../tsconfig.nextjs.json`
4. Create `next.config.ts` using `withAuth` from `heimdall/config`
5. Create `proxy.ts` using `proxy` from `heimdall/proxy`
6. Create `app/globals.css` importing `sindri/theme.css` with `@source` directives for sindri and ui
7. Create `app/layout.tsx` with the Inter font and metadata
8. Create `app/login/page.tsx` re-exporting from `sindri/login-page`

No `postcss.config.mjs` needed — apps inherit from the root config.

## Adding a New Package

1. Create `packages/<name>/package.json` with a `name` field and `dev`/`build` scripts
2. Create `packages/<name>/tsconfig.json` extending `../../tsconfig.base.json`
3. Configure `tsup.config.ts` for bundling (see existing packages for examples)
4. Add the package to `pnpm-workspace.yaml` if not already covered by the `packages/*` glob
5. Reference it from apps via `"<name>": "workspace:*"` in their `package.json`

## Working with Shared Packages

All shared packages run in watch mode during `pnpm dev`. Changes to package source files trigger rebuilds, and Next.js apps pick up the changes automatically via Turbopack.

**Important:** The ui package's tsup `--watch` mode with DTS generation can cause memory issues. In dev mode it runs with `--no-dts`. If you need type checking, run `pnpm check-types` separately.

## Git Workflow

- **Atomic commits** — Each commit is one logical change
- **Imperative mood** — "Add feature" not "Added feature"
- **Feature branches** for non-trivial work
- **Pre-commit hook** runs `pnpm biome check` automatically

## Project Structure

```
midgard/
├── apps/
│   ├── admin/       # Main dashboard (port 3000, authenticated)
│   ├── chat/        # Chat app (port 3002, authenticated)
│   └── docs/        # Documentation (port 3001, public)
├── packages/
│   ├── ui/          # UI component library
│   ├── heimdall/    # Auth module
│   ├── hlidskjalf/  # Terminal dev dashboard
│   ├── sindri/      # Shared UI resources
│   └── reactbits/   # Animation components
├── docs/            # Documentation (rendered by docs app)
├── turbo.json       # Build orchestration
└── biome.json       # Linting & formatting
```
