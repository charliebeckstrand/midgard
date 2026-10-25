import type { IntlCatalogs } from 'ui/primitives/intl'
import { translations } from '../lang/index.ts'

/**
 * The translated messages of the docs, by language subtag: each translation
 * in `lang/`. English has no entry, because the default message of each
 * descriptor is English. The shell gives them to its `LocaleProvider`, over
 * the catalogs of ui. They do not go into the catalog of ui, because the docs
 * do not ship with the library.
 */
export const catalogs: IntlCatalogs = translations
