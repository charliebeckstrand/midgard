import { loadMessages, uiChain } from '../../primitives/intl/intl-catalog'
import { CATALOG_LOCALES } from '../../primitives/intl/intl-language'

// Each translation of ui loads when a provider first shows its language, and
// the provider suspends until then (`primitives/intl/intl-catalog.ts`). The
// load before each file gives each case the state of a page that already
// loaded each translation. A case that renders in another language thus reads
// its text at once, and a pure builder can take the intl of the language
// (`localeIntl`). The cases of the load itself use loaders of their own.
await Promise.all(CATALOG_LOCALES.map((locale) => loadMessages(uiChain, locale)))
