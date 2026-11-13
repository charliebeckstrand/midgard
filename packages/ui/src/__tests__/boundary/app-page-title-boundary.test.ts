// @vitest-environment node
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceRoot, workspaceSources } from '../helpers/walk-source'

// App page title boundary.
//
// The title of a page names the page in the tabs and the history of the
// browser, and a screen reader announces it after each navigation (WCAG 2.4.2).
// The root layout of each app sets its title with `appTitle` from
// `shared/pages`: the home page shows the name of the app, and each other page
// puts its own title before the name. So each page below the home page exports
// a `metadata` or a `generateMetadata` that gives its title, or re-exports the
// `metadata` of a shared page.

/** A root layout of an app: `apps/<app>/app/layout.tsx`. */
const ROOT_LAYOUT = /^apps\/[^/]+\/app\/layout\.tsx$/

/** A page of an app, with the path of its route after `app/`. */
const PAGE = /^apps\/[^/]+\/app\/(?:(.*)\/)?page\.tsx$/

/** A route group, such as `(signed-in)`, which adds no segment to the path. */
const ROUTE_GROUP = /^\(.+\)$/

/** The export of a title: a `metadata`, a `generateMetadata`, or a re-export as `metadata`. */
const TITLE_EXPORT =
	/export\s+(?:const\s+metadata\b|(?:async\s+)?function\s+generateMetadata\b)|\bas\s+metadata\b/

/** Whether the route of a page is the home page: no segment but route groups. */
function isHome(route: string | undefined): boolean {
	return (route ?? '').split('/').every((segment) => segment === '' || ROUTE_GROUP.test(segment))
}

describe('app page title boundary', () => {
	const files = workspaceSources([join(workspaceRoot, 'apps')])

	const pages = [...files].filter(([file]) => PAGE.test(file))

	const layouts = [...files].filter(([file]) => ROOT_LAYOUT.test(file))

	it('reads the pages and the root layouts of the apps', () => {
		// A walk that read no page would pass the cases below with an empty list.
		expect(pages.length).toBeGreaterThan(10)

		expect(layouts.length).toBeGreaterThan(1)
	})

	it('titles each root layout with appTitle', () => {
		const violations = layouts.filter(([, code]) => !/\btitle:\s*appTitle\(/.test(code))

		expect(
			violations.map(([file]) => file),
			'root layouts with no `title: appTitle(…)` from `shared/pages`',
		).toEqual([])
	})

	it('gives each page below the home page a title', () => {
		const violations = pages
			.filter(([file]) => !isHome(PAGE.exec(file)?.[1]))
			.filter(([, code]) => !TITLE_EXPORT.test(code))
			.map(([file]) => file)

		expect(
			violations,
			'pages with no `metadata` or `generateMetadata` (give the page a title)',
		).toEqual([])
	})

	it('reads a route of route groups only as the home page', () => {
		expect(isHome(undefined)).toBe(true)

		expect(isHome('(signed-in)/(dashboard)')).toBe(true)

		expect(isHome('(guest)/login')).toBe(false)

		expect(isHome('week/[week]')).toBe(false)
	})
})
