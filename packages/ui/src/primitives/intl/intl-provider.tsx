'use client'

import type { ReactNode } from 'react'
import { IntlContext } from './context'
import { englishIntl, localeIntl } from './intl-catalog'

/**
 * Props for {@link IntlProvider}: the locale of the subtree, plus `children`.
 *
 * @internal
 */
export type IntlProviderProps = {
	/**
	 * The locale of the subtree, as a BCP 47 tag. The controls under the
	 * provider show the messages of its language.
	 *
	 * @defaultValue English.
	 */
	locale?: string
	children: ReactNode
}

/**
 * Gives the controls under it the intl of `locale`, with the catalog of its
 * language. There is one intl for each locale, so a nested provider in the
 * same locale gives the same object, and its subtree does not render again.
 * `LocaleProvider` renders it with its locale.
 *
 * @internal
 */
export function IntlProvider({ locale, children }: IntlProviderProps) {
	return (
		<IntlContext value={locale === undefined ? englishIntl : localeIntl(locale)}>
			{children}
		</IntlContext>
	)
}
