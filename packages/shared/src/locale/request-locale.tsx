import { cookies, headers } from 'next/headers'
import type { ReactNode } from 'react'
import { LOCALE_COOKIE, LocaleProvider, resolveRequestLocale } from 'ui/providers/locale'
import { LOCALES } from './locales'

/**
 * Renders `children` in the locale of the request, so the server markup shows
 * the formats and the messages of ui in the language of the reader. It reads
 * the locale cookie, which the Language picker writes, and else the
 * `Accept-Language` header.
 *
 * Render it in a layout or a page that already renders for each request, such
 * as one that reads the session. It reads the cookies and the headers, so a
 * prerendered route that renders it would render at request time.
 *
 * @remarks The root layout stays static and renders in `en-US`, and the stored
 * choice applies there after hydration. Under this component, the server and
 * the browser agree on the locale from the first render. The provider here
 * shares the stored choice of the root provider, so a new choice applies to
 * both at once.
 */
export async function RequestLocale({ children }: { children: ReactNode }) {
	const [cookieStore, headerList] = await Promise.all([cookies(), headers()])

	const locale = resolveRequestLocale({
		cookie: cookieStore.get(LOCALE_COOKIE)?.value,
		acceptLanguage: headerList.get('accept-language'),
		locales: LOCALES,
	})

	return (
		<LocaleProvider locale={locale} locales={LOCALES}>
			{children}
		</LocaleProvider>
	)
}
