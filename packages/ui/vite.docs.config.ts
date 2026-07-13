import { declaredDefaults } from 'docs/adapters'
import { defineDocsConfig } from 'docs/vite'

// The docs site for ui. The `docs` package supplies the markdown pipeline, the
// extractor-backed api module, and the build wiring; ui supplies its
// `packageName`, the chrome under `src/docs`, the content it documents, and —
// through `extraDefaults` — the reader for its recipe-system variant defaults,
// a convention the agnostic engine knows nothing about.
export default defineDocsConfig({
	packageName: 'ui',
	apiPackageDir: import.meta.dirname,
	extraDefaults: declaredDefaults({ dir: 'src/recipes/kata', call: 'defineRecipe' }),
})
