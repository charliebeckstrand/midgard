import type { IntlCatalogs } from 'ui/primitives/intl'
import es from '../lang/es.json'

/**
 * The translated messages of the docs, by language subtag. English has no
 * entry, because the default message of each descriptor is English. The shell
 * gives them to its `LocaleProvider`, over the catalogs of ui. They do not go
 * into the catalog of ui, because the docs do not ship with the library.
 */
export const catalogs: IntlCatalogs = { es }
