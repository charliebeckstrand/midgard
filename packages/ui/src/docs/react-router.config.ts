import { globSync } from 'node:fs'
import type { Config } from '@react-router/dev/config'
import { DEMO_GLOBS } from './app/demo-globs'
import { pathToId } from './engine/demo-id'

// A static site: no server at run time. The build renders each page to its own
// HTML file, and the browser hydrates it.
export default {
	appDirectory: 'app',
	buildDirectory: 'dist',
	ssr: false,
	prerender: () => [
		'/',
		...globSync(DEMO_GLOBS, { cwd: import.meta.dirname }).map(
			(path) => `/${pathToId(`./${path}`)}`,
		),
	],
} satisfies Config
