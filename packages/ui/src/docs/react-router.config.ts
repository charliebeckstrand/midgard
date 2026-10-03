import { globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Config } from '@react-router/dev/config'
import { DEMO_GLOBS } from './app/demo-globs'
import { pageTabPath, pathToId } from './engine/demo-id'
import { parsePageTabs } from './engine/plugins/page-tabs'
import { inlinePageStyles } from './engine/vite/inline-styles'

// Each demo page, and each tab of a page that has `PageTabs`.
function demoPaths(): string[] {
	return globSync(DEMO_GLOBS, { cwd: import.meta.dirname }).flatMap((file) => {
		const id = pathToId(`./${file}`)

		const tabs = parsePageTabs(file, readFileSync(path.join(import.meta.dirname, file), 'utf8'))

		return [`/${id}`, ...(tabs?.others.map((tab) => pageTabPath(id, tab, tabs.defaultValue)) ?? [])]
	})
}

// A static site: no server at run time. The build renders each page to its own
// HTML file, and the browser hydrates it. Each file holds the styles of its
// page, so the first paint does not wait for the full stylesheet.
const config: Config = {
	appDirectory: 'app',
	buildDirectory: 'dist',
	ssr: false,
	prerender: () => ['/', ...demoPaths()],
	buildEnd: ({ reactRouterConfig }) =>
		inlinePageStyles({
			clientDir: path.join(reactRouterConfig.buildDirectory, 'client'),
			stylesheet: path.join(import.meta.dirname, 'app.css'),
		}),
}

export default config
