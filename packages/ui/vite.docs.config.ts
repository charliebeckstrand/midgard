import { readRecipeDefaults } from './src/docs/engine/recipe-defaults'
import { defineDocsConfig } from './src/docs/engine/vite'

// The docs site for ui. The engine (under src/docs/engine) supplies the
// markdown pipeline, the extractor-backed api module, and the build wiring; ui
// supplies its `packageName`, the chrome under src/docs/shell, the content it
// documents, and — through `extraDefaults` — the reader for its recipe-system
// variant defaults, a convention the agnostic engine knows nothing about.
export default defineDocsConfig({
	packageName: 'ui',
	apiPackageDir: import.meta.dirname,
	extraDefaults: readRecipeDefaults,
})
