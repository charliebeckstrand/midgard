# UI docs engine

A self-contained documentation site for the `ui` package. Each documented module gets one page: a live render of the synthesized component beneath the description, then three tabs — an **Overview** (`## Overview` prose), a **Usage** tab (the import, the synthesized example's code, and `## Usage` prose), and a generated **API reference**. The engine is a library-agnostic Vite plugin under `engine/`; `ui` wires it up in `vite.docs.config.ts`, and the browser chrome (router, sidebar, tabs) lives in `shell/`.

## Authoring a page

Add a Markdown file under `content/<category>/<slug>.md`. The path is the configuration:

- **`<category>`** — the first directory — becomes a sidebar section. It is an open set: a new directory is a new section.
- **`<slug>`** — the filename stem — resolves to the module's import specifier against the package's real export surface. `content/components/button.md` → the `button` module. A slug that matches no per-directory specifier falls back to the category barrel; that is how a hook page (`content/hooks/use-controllable.md` → the `hooks` barrel) attaches to one symbol.

A page is **prose only**, and a high-level overview: what the component is, what it does, and when to reach for it. A single `# h1` (the display name), a first paragraph (the description, shown in the sidebar and page header), then two sections — `## Overview` (what it is and does) and `## Usage` (when and how to reach for it) — rendered on the matching tabs.

**Keep props, values, and variants out of the prose.** The API tab lists them from the source's TSDoc and the page renders a live synthesized example — both discerned from the code, so they never drift. Anything you restate in prose (a variant name, a color, a default) is a second copy that will. Describe the component's purpose and behavior at a level the code doesn't already declare. There is likewise no front matter for title, order, or placement; those derive from the h1 and the path, and pages sort by name.

**Never hardcode the package name.** The synthesized example and the API reference render the package's own name (read from its `package.json`), so a repo that vendors this package under a different name — say `@scope/ui` — shows `@scope/ui/button` with no edit.

## Front matter

Optional, and a strict whitelist — an unknown key fails the build. Every key is itself optional.

| Key | Type | Purpose |
| --- | --- | --- |
| `module` | string | Override the derived import specifier. |
| `symbols` | string[] | Narrow which of the module's exports the page documents (Usage and API). |
| `usage` | mapping | Tune the synthesized example. |

`usage.*`:

| Key | Type | Default | Purpose |
| --- | --- | --- | --- |
| `domain` | `generic \| people \| commerce \| geo` | `generic` | Vocabulary for synthesized strings and data. |
| `include` | string[] | — | Props the synthesizer must always set. |
| `exclude` | string[] | — | Props the synthesizer must never set. |
| `wrap` | string[] | — | Provider components to wrap the example in, e.g. `['UIProvider']`. |

## Template

````md
# Component

One sentence on what it is.

## Overview

What the component is and does, in prose — no props or values; the API and
Usage tabs carry those.

## Usage

When and how to reach for it, and what to pair it with.
````

## Running locally

From `packages/ui`:

- `pnpm docs` — dev server, hot-reloading on content and source.
- `pnpm docs:build` — production build.
- `pnpm docs:preview` — serve the build on port 3456.

The Overview and Usage tabs mount the real components, so open a new page in `pnpm docs` to confirm its example renders before committing.
