import path from 'node:path'
import type { Config } from '@react-router/dev/config'
import { LOCALES } from './app/language.ts'
import { prerenderLocales } from './plugin/locale-pages.ts'
import { inlineCriticalCss } from './plugin/styles.ts'

// No server render at run time. The build renders each page to its own HTML
// file, and the browser hydrates it. Each file holds the critical
// CSS of its page, so the first paint does not wait for the full stylesheet.
// The build renders each page again in each other locale, and the server of
// the docs sends the HTML of the locale of the request (`app/language.ts`).
const config: Config = {
	appDirectory: 'app',
	buildDirectory: 'dist',
	ssr: false,
	// Each path with no params. The not-found route has none of its own: the
	// host gives the SPA fallback document for any other path.
	prerender: ({ getStaticPaths }) => getStaticPaths(),
	buildEnd: async ({ reactRouterConfig }) => {
		const clientDir = path.join(reactRouterConfig.buildDirectory, 'client')

		await prerenderLocales(
			path.join(reactRouterConfig.buildDirectory, 'server'),
			clientDir,
			LOCALES,
		)

		const stylesheet = path.join(import.meta.dirname, 'app', 'app.css')

		await inlineCriticalCss(clientDir, stylesheet)
	},
}

export default config
