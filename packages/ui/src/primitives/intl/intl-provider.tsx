'use client'

import type { ReactNode } from 'react'
import { IntlCatalogsContext, IntlContext, useIntlCatalogs } from './context'
import { catalogIntl, mergeCatalogs } from './intl-catalog'
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
 * @internal
 */
export function IntlProvider({ locale = 'en', catalogs, children }: IntlProviderProps) {
	const outer = useIntlCatalogs()

	const merged = catalogs ? mergeCatalogs(outer, catalogs) : outer

	return (
		<IntlCatalogsContext value={merged}>
			<IntlContext value={catalogIntl(locale, merged)}>{children}</IntlContext>
		</IntlCatalogsContext>
	)
}
