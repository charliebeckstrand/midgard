import path from 'node:path'
import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'
import { findPages } from '../plugin/pages.ts'

// Each page is a route, and each tab of a page is a child route one part down
// the path. The root path lists the pages, and any other path shows the
// not-found page. A layout route holds each of them, so an error in a page
// stays below the shell, and the sidebar and the header stay. The id of a
// page route is the path of the page, so the shell finds the page in its
// matches. A page or a tab matches only in its own case, so `/Button` shows
// the not-found page.
export default [
	layout('routes/page.tsx', [
		index('routes/home.tsx'),
		...findPages(path.join(import.meta.dirname, '..')).map((page) =>
			route(
				page.path.slice(1),
				`../pages/${page.folder}/index.tsx`,
				{ id: page.path, caseSensitive: true },
				page.tabs.map((tab) =>
					route(tab, `../pages/${page.folder}/${tab}/index.tsx`, { caseSensitive: true }),
				),
			),
		),
		route('*', 'routes/not-found.tsx'),
	]),
] satisfies RouteConfig
