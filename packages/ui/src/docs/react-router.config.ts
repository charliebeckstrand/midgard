import path from 'node:path'
import type { Config } from '@react-router/dev/config'
import { LOCALES, localeFile } from './app/language.ts'
import { prerenderLocales } from './plugin/locale-pages.ts'
import { inlineCriticalCss } from './plugin/styles.ts'
import { docsTarget, moveUnderBase } from './plugin/target.ts'

// No server render at run time. The build renders each page to its own HTML
// file, and the browser hydrates it. Each file holds the critical
// CSS of its page, so the first paint does not wait for the full stylesheet.
// The build renders each page again in each other locale, and the server of
// the docs sends the HTML of the locale of the request (`app/language.ts`).
const target = docsTarget()

const config: Config = {
	appDirectory: 'app',
	// The folder of the build, and the path of the site that it is for (`plugin/target.ts`).
	buildDirectory: target.buildDirectory,
	basename: target.base,
	ssr: false,
	// Each path with no params. The not-found route has none of its own: the
	// host gives the SPA fallback document for any other path. The dev server
	// does not prerender: it sends the SPA document, and the browser renders
	// the page. Thus the first page loads faster, but a hydration mismatch
	// shows only in a build.
	prerender:
		process.env.NODE_ENV === 'production' ? ({ getStaticPaths }) => getStaticPaths() : false,
	// With a base, the build first moves the assets and the fallback document
	// into the folder of the base, where React Router wrote the pages. Thus each
	// step after the move finds each file of the build in that folder.
	buildEnd: async () => {
		const { base, buildDirectory, clientDir } = target

		await moveUnderBase(clientDir, base)

		await prerenderLocales(path.join(buildDirectory, 'server'), clientDir, LOCALES)

		const stylesheet = path.join(import.meta.dirname, 'app', 'app.css')

		await inlineCriticalCss(path.join(clientDir, base), stylesheet, (page) =>
			LOCALES.slice(1).map((locale) => localeFile(page, locale)),
		)
	},
}

export default config
