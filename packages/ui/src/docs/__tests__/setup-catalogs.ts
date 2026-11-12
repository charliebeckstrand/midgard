import { extendChain, loadMessages, uiChain } from '../../primitives/intl/intl-catalog.ts'
import { catalogs } from '../app/catalogs.ts'
import { LOCALES } from '../app/language.ts'

// Each translation of the docs loads when a provider first shows its language,
// as the translations of ui do (`src/__tests__/setup/catalogs.ts`). The load
// before each file gives each case the state of a page that already loaded
// each translation, so a page renders in each language at once.
await Promise.all(LOCALES.map((locale) => loadMessages(extendChain(uiChain, catalogs), locale)))
