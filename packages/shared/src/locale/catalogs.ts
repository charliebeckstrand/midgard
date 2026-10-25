import type { IntlCatalogs } from 'ui/primitives/intl'
import { translations } from './lang'

/**
 * The translated messages of shared, by language subtag: each translation in
 * `lang/`. English has no entry, because the default message of each
 * descriptor is English. `AppProviders` gives them to its `LocaleProvider`,
 * and each provider under it keeps them, so a `RequestLocale` shows the
 * messages of shared in the locale of the request.
 */
export const catalogs: IntlCatalogs = translations
