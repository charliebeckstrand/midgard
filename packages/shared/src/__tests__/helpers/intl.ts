import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { type IntlShape, useIntl } from 'ui/primitives/intl'
import { LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'
import { catalogs } from '../../locale/catalogs'

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

	// The third argument gives the children, which the props type requires.
	renderToString(
		createElement(
			LocaleProvider,
			{ locale, catalogs } as LocaleProviderProps,
			createElement(Probe),
		),
	)

	if (!intl) throw new Error('The probe read no intl.')

	return intl
}
