import { globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'
import { byName, PAGE_GLOBS, pageOf } from '../engine/pages'
import { parsePageTabs } from '../engine/plugins/page-tabs'

const docs = path.join(import.meta.dirname, '..')

// Each demo file is the route of its page. A page with `PageTabs` takes its
// tab as the last part of the path (`/progress/gauge`).
const pages = globSync(PAGE_GLOBS, { cwd: docs })
	.map((file) => {
		const tabs = parsePageTabs(file, readFileSync(path.join(docs, file), 'utf8'))

		return { ...pageOf(file), file: `../${file}`, tabbed: tabs !== null }
	})
	.toSorted(byName)

const [first] = pages

if (!first) throw new Error('docs: no demo pages')

// Each page shares one layout, which loads the API data of the page. The
// root path shows the first page. A path from before the paths of today goes
// to `legacy.tsx`, outside the layout, because the build renders no file for it.
export default [
	layout('routes/page.tsx', [
		index(first.file, { id: 'index' }),
		...pages.map((page) =>
			route(page.tabbed ? `${page.path.slice(1)}/:tab?` : page.path.slice(1), page.file, {
				id: page.id,
			}),
		),
	]),
	route('*', 'routes/legacy.tsx'),
] satisfies RouteConfig
