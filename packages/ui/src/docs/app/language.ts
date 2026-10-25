import { CATALOG_LOCALES, LOCALE_COOKIE, resolveRequestLocale } from 'ui/providers/locale'

// The docs have one HTML file for each page in each language: `index.html`
// in English, and `index.<locale>.html` in each other language, such as
// `index.es.html`. The build renders each file with the locale of its
// language, and the server of the docs sends the file of the locale of the
// request (`scripts/docs-server.ts`). The browser hydrates the page in the
// locale of the file, from the `lang` of the root element. Thus the first
// paint and the hydration render show the language of the reader, and no text
// changes its language after hydration.

/**
 * The locales that a reader can choose in the settings: one locale for each
 * language that ui has a catalog for ({@link CATALOG_LOCALES}), as in the
 * apps. The docs have a catalog for each of the languages, and the catalog
 * test holds the two lists in step. The first locale is the default, and the
 * HTML file of a page in the default locale has no locale in its name. Another
 * locale shows the controls of ui, the text of the shell and the kit, and the
 * text of the demos in its language. The names from the code and the TSDoc
 * stay English.
 */
export const LOCALES = CATALOG_LOCALES

/** The value of the cookie `name` in the `Cookie` header `header`, or `undefined`. */
function readCookieHeader(header: string, name: string): string | undefined {
	const prefix = `${name}=`

	const entry = header
		.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix))

	if (entry === undefined) return undefined

	try {
		return decodeURIComponent(entry.slice(prefix.length))
	} catch {
		return undefined
	}
}

/**
 * The locale of a request: the locale that the reader chose in the settings,
 * from its cookie, else the match of the `Accept-Language` header, else the
 * default. The browser resolves the same choice after hydration, so the two
 * agree.
 */
export function requestLocale(headers: {
	cookie?: string | null
	acceptLanguage?: string | null
}): string {
	return resolveRequestLocale({
		cookie: headers.cookie ? readCookieHeader(headers.cookie, LOCALE_COOKIE) : undefined,
		acceptLanguage: headers.acceptLanguage,
		locales: LOCALES,
	})
}

/** The locale of the HTML of the page in the browser: the `lang` of the root element, if it is one of {@link LOCALES}. */
export function readDocumentLocale(): string {
	const { lang } = document.documentElement

	return LOCALES.find((locale) => locale === lang) ?? LOCALES[0]
}

/**
 * The name of the HTML file of a page in `locale`: `index.html` for the
 * default locale, else `index.<locale>.html`, such as `index.es.html`. The
 * fallback document of a path with no page has the same rule.
 */
export function localeFile(file: string, locale: string): string {
	return locale === LOCALES[0] ? file : file.replace(/\.html$/, `.${locale}.html`)
}
