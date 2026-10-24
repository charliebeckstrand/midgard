import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequestHandler, type ServerBuild } from 'react-router'
import { LOCALE_COOKIE } from 'ui/providers/locale'
import { localeFile } from '../app/language.ts'

// The prerender of React Router renders each page once, in the default
// locale. This pass renders each page again in each other locale, from the
// server build, with the cookie of the locale (`app/language.ts`). It writes
// the HTML of a page in a locale next to the HTML of the page in the default
// locale, such as `button/index.es.html` next to `button/index.html`. The
// fallback document of a path with no page gets a copy in each locale too.

/** The header that tells the server build to render the fallback document. */
const SPA_MODE = 'X-React-Router-SPA-Mode'

/** Renders `pathname` in `locale` with `handler`, and gives the HTML. */
async function render(
	handler: (request: Request) => Promise<Response>,
	pathname: string,
	locale: string,
	headers: Record<string, string> = {},
): Promise<string> {
	const response = await handler(
		new Request(`http://localhost${pathname}`, {
			headers: { ...headers, cookie: `${LOCALE_COOKIE}=${encodeURIComponent(locale)}` },
		}),
	)

	const html = await response.text()

	if (response.status !== 200) {
		throw new Error(`docs: the ${locale} render of ${pathname} gave ${response.status}\n${html}`)
	}

	return html
}

/**
 * Writes the HTML of each prerendered page, and of the fallback document, in
 * each locale of `locales` but the first, into `clientDir`. The server build
 * is in `serverDir`.
 */
export async function prerenderLocales(
	serverDir: string,
	clientDir: string,
	locales: readonly string[],
): Promise<void> {
	// The path of the server build is known only at the end of the build.
	const build: ServerBuild = await import(
		/* @vite-ignore */ pathToFileURL(path.join(serverDir, 'index.js')).href
	)

	const handler = createRequestHandler(build, 'production')

	// The server build reads the header of the fallback document only in a
	// request of the build, as in the prerender of React Router.
	const isBuildRequest = process.env.IS_RR_BUILD_REQUEST

	process.env.IS_RR_BUILD_REQUEST = 'yes'

	try {
		for (const locale of locales.slice(1)) {
			for (const prerendered of build.prerender) {
				const pathname = `/${prerendered}/`.replace(/\/+/g, '/')

				const file = path.join(clientDir, pathname, localeFile('index.html', locale))

				await mkdir(path.dirname(file), { recursive: true })

				await writeFile(file, await render(handler, pathname, locale))
			}

			await writeFile(
				path.join(clientDir, localeFile('__spa-fallback.html', locale)),
				await render(handler, '/', locale, { [SPA_MODE]: 'yes' }),
			)
		}
	} finally {
		if (isBuildRequest === undefined) delete process.env.IS_RR_BUILD_REQUEST
		else process.env.IS_RR_BUILD_REQUEST = isBuildRequest
	}
}
