import { createElement } from 'react'
import { prerender } from 'react-dom/static'
import { CATALOG_LOCALES, LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'
import { catalogs } from '../locale/catalogs'
// The setup of the app suites: the `Request` patch, the matchers, the cleanup,
// and the wait budget.
import '../testing/setup'

// Each translation loads when a `LocaleProvider` first shows its language, and
// the provider suspends until then. A render of `renderToString` does not wait,
// so this render loads each translation of ui and of shared before the test
// file runs. A case then renders in each language at once.
await Promise.all(
	CATALOG_LOCALES.map((locale) => {
		// The third argument gives the children, which the props type requires.
		const props = { locale, catalogs } as LocaleProviderProps

		return prerender(createElement(LocaleProvider, props, null))
	}),
)
