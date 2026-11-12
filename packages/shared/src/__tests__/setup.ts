import { createElement } from 'react'
import { prerender } from 'react-dom/static'
import { CATALOG_LOCALES, LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'
import { catalogs } from '../locale/catalogs'

// A browser resolves a same-origin path, and the `Request` of Node takes only an
// absolute URL. A setup file runs before the test file imports its modules.
globalThis.Request = class extends Request {
	constructor(input: RequestInfo | URL, init?: RequestInit) {
		super(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
	}
}

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
