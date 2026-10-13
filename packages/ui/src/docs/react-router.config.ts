import path from 'node:path'
import type { Config } from '@react-router/dev/config'
import { inlineCriticalCss } from './plugin/styles.ts'

// A static site: no server at run time. The build renders each page to its
// own HTML file, and the browser hydrates it. Each file holds the critical
// CSS of its page, so the first paint does not wait for the full stylesheet.
const config: Config = {
	appDirectory: 'app',
	buildDirectory: 'dist',
	ssr: false,
	// Each path with no params. The not-found route has none of its own: the
	// host gives the SPA fallback document for any other path.
	prerender: ({ getStaticPaths }) => getStaticPaths(),
	buildEnd: async ({ reactRouterConfig }) => {
		const clientDir = path.join(reactRouterConfig.buildDirectory, 'client')

		const stylesheet = path.join(import.meta.dirname, 'app', 'app.css')

		await inlineCriticalCss(clientDir, stylesheet)
	},
}

export default config
