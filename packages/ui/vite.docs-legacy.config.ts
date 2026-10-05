import { defineDocsConfig } from './src/docs-legacy/engine/vite'

// The legacy docs site for ui. The engine (under src/docs-legacy/engine) supplies the
// plugin, chrome, and build wiring; ui supplies its `packageName`, its source
// (auto-detected at `src/`), and its demos under `src/docs-legacy/demos`.
export default defineDocsConfig({ packageName: 'ui' })
