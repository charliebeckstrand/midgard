import { defineDocsConfig } from './src/docs/engine/vite'

// The docs site for ui. The engine (under src/docs/engine) supplies the
// plugin, chrome, and build wiring; ui supplies its `packageName`, its source
// (auto-detected at `src/`), and its demos under `src/docs/demos`.
export default defineDocsConfig({ packageName: 'ui' })
