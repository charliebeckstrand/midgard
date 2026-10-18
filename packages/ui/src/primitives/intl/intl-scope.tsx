'use client'

import type { ReactNode } from 'react'
import { type IntlShape, RawIntlProvider } from 'react-intl'

/**
 * Props for {@link IntlScope}: the intl to give, plus `children`.
 *
 * @internal
 */
export type IntlScopeProps = {
	/** The intl that the controls under the scope read through `useIntl`. */
	intl: IntlShape
	children: ReactNode
}

/**
 * Gives `intl` to the controls under it. `LocaleProvider` renders it with the
 * shared intl of its locale, so no module outside `primitives/intl` renders a
 * provider of `react-intl`.
 *
 * @internal
 */
export function IntlScope({ intl, children }: IntlScopeProps) {
	return <RawIntlProvider value={intl}>{children}</RawIntlProvider>
}
