'use client'

import { createContext } from '../../core'
import { intlEn, uiCatalogs } from './intl-catalog'
import type { IntlCatalogs, IntlShape } from './types'

/**
 * The context of the intl that `IntlProvider` gives. Outside each provider, it
 * holds an English intl, so a component renders its default messages with no
 * provider. A control reads it through `useIntl`.
 *
 * @internal
 */
export const [IntlContext, useIntlContext] = createContext<IntlShape>('Intl', {
	default: intlEn,
})

/**
 * The context of the catalogs of the nearest `IntlProvider`: the catalogs of ui
 * with each `catalogs` of the enclosing providers merged over them. A nested
 * provider merges its own `catalogs` over these. Outside each provider, it holds
 * the catalogs of ui.
 *
 * @internal
 */
export const [IntlCatalogsContext, useIntlCatalogs] = createContext<IntlCatalogs>('IntlCatalogs', {
	default: uiCatalogs,
})
