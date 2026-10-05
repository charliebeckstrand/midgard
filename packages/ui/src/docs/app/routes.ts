import path from 'node:path'
import { index, type RouteConfig, route } from '@react-router/dev/routes'
import { findPages } from '../plugin/pages.ts'

// Each page is a route, and each tab of a page is a child route one part down
// the path. The root path lists the pages, and any other path shows the
// not-found page.
export default [
	index('routes/home.tsx'),
	...findPages(path.join(import.meta.dirname, '..')).map((page) =>
		route(
			page.path.slice(1),
			`../pages/${page.folder}/index.tsx`,
			page.tabs.map((tab) => route(tab, `../pages/${page.folder}/${tab}/index.tsx`)),
		),
	),
	route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
