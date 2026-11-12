'use client'

import { type ReactNode, use } from 'react'
import { IntlCatalogsContext, IntlContext, useIntlCatalogs } from './context'
import { catalogIntl, chainMessages, extendChain } from './intl-catalog'
import { getLanguage } from './intl-language'
import type { IntlCatalogs } from './types'

/**
 * Props for {@link IntlProvider}: the locale and the catalogs of the subtree,
 * plus `children`.
 *
 * @internal
 */
export type IntlProviderProps = {
	/**
	 * The locale of the subtree, as a BCP 47 tag. The controls under the
	 * provider show the messages of its language.
	 *
	 * @defaultValue `'en'`
	 */
	locale?: string
	/**
	 * The catalogs of an app or a package, merged over the catalogs of the
	 * enclosing provider.
	 */
	catalogs?: IntlCatalogs
	children: ReactNode
}

/**
 * Gives the controls under it the intl of `locale`, with the catalog of its
 * language. The catalogs are the catalogs of ui, with `catalogs` and the
 * catalogs of each enclosing provider merged over them. There is one intl for
 * each locale and catalog set. A nested provider in the same locale and with
 * the same catalogs thus gives the same object, and its subtree does not render
 * again. `LocaleProvider` renders it with its locale.
 *
 * A translation that a loader gives loads when the provider first shows its
 * language, and the provider suspends until it loads. Thus the server render
 * waits for the translation, and the hydration render keeps the HTML of the
 * server until it loads. No text shows in English first.
 *
 * @internal
 */
export function IntlProvider({ locale = 'en', catalogs, children }: IntlProviderProps) {
	const outer = useIntlCatalogs()

	const chain = catalogs ? extendChain(outer, catalogs) : outer

	const found = chainMessages(chain, getLanguage(locale))

	// A provider reads a load through `use` at each render, so the load reads
	// the same at each render, and after it settles too.
	const messages = found instanceof Promise ? use(found) : found

	return (
		<IntlCatalogsContext value={chain}>
			<IntlContext value={catalogIntl(locale, messages)}>{children}</IntlContext>
		</IntlCatalogsContext>
	)
}
