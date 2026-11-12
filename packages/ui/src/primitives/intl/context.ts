'use client'

import { createContext } from '../../core/create-context'
import { type CatalogChain, intlEn, uiChain } from './intl-catalog'
import type { IntlShape } from './types'

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
 * The context of the catalogs of the nearest `IntlProvider`: the catalogs of ui,
 * then each `catalogs` of the enclosing providers. A nested provider adds its
 * own `catalogs` after these. Outside each provider, it holds the catalogs of
 * ui.
 *
 * @internal
 */
export const [IntlCatalogsContext, useIntlCatalogs] = createContext<CatalogChain>('IntlCatalogs', {
	default: uiChain,
})
