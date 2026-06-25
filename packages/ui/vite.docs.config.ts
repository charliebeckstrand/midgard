import { defineDocsConfig } from 'docs/vite'

// The docs site for ui. The shared engine (the `docs` package) supplies the
// plugin, chrome, and build wiring; ui supplies its `packageName`, its source
// (auto-detected at `src/`), and its demos under `src/docs/demos`.
export default defineDocsConfig({ packageName: 'ui' })
