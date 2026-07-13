import { defineDocsConfig } from 'docs/vite'

// The docs site for ui. The `docs` package supplies the markdown pipeline,
// the extractor-backed api module, and the build wiring; ui supplies its
// `packageName`, the chrome under `src/docs`, and the content it documents.
export default defineDocsConfig({ packageName: 'ui', apiPackageDir: import.meta.dirname })
