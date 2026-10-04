import { globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Config } from '@react-router/dev/config'
import { PAGE_GLOBS, pageOf } from './engine/pages'
import { parsePageTabs } from './engine/plugins/page-tabs'
import { inlinePageStyles } from './engine/vite/inline-styles'

// Each page, and each tab of a page that has `PageTabs`. The default tab is at
// the path of its page.
function pagePaths(): string[] {
	return globSync(PAGE_GLOBS, { cwd: import.meta.dirname }).flatMap((file) => {
		const page = pageOf(file)

		const tabs = parsePageTabs(file, readFileSync(path.join(import.meta.dirname, file), 'utf8'))

		return [page.path, ...(tabs?.others.map((tab) => `${page.path}/${tab}`) ?? [])]
	})
}

// A static site: no server at run time. The build renders each page to its own
// HTML file, and the browser hydrates it. Each file holds the styles of its
// page, so the first paint does not wait for the full stylesheet.
const config: Config = {
	appDirectory: 'app',
	buildDirectory: 'dist',
	ssr: false,
	prerender: () => ['/', ...pagePaths()],
	buildEnd: ({ reactRouterConfig }) =>
		inlinePageStyles({
			clientDir: path.join(reactRouterConfig.buildDirectory, 'client'),
			stylesheet: path.join(import.meta.dirname, 'app.css'),
		}),
}

export default config
