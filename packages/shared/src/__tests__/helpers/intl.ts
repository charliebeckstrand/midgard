import { createElement, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { type IntlShape, useIntl } from 'ui/primitives/intl'
import { LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'
import { catalogs } from '../../locale/catalogs'

/** The server markup of `node` in `locale`, with the catalogs of shared, as `AppProviders` gives them. */
export function renderInLocale(locale: string, node: ReactNode): string {
	// The third argument gives the children, which the props type requires.
	const props = { locale, catalogs } as LocaleProviderProps

	return renderToString(createElement(LocaleProvider, props, node))
}

/**
 * The intl that a component under `AppProviders` reads in `locale`, with the
 * catalogs of shared. A pure builder that takes an intl, such as a field
 * validator, takes this one in a test.
 */
export function intlFor(locale: string): IntlShape {
	let intl: IntlShape | undefined

	function Probe() {
		intl = useIntl()

		return null
	}

	renderInLocale(locale, createElement(Probe))

	if (!intl) throw new Error('The probe read no intl.')

	return intl
}
