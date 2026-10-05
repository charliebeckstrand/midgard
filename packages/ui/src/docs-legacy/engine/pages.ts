import { pascalCase } from './components/format'

/**
 * The demo files that are pages, relative to `src/docs`: each file in a folder
 * of `demos/`, and the `index.tsx` of each folder in such a folder. Another
 * file in that folder is a part of its page, such as its data.
 * `import.meta.glob` takes only literals, so `pages.server.ts` repeats the
 * list.
 */
export const PAGE_GLOBS = ['demos/*/*.tsx', 'demos/*/*/index.tsx']

/** One page of the docs site: a demo file, and the path that shows it. */
export type Page = {
	/** The key of the API data of the page, such as `button` or `structure-box`. */
	id: string
	/** The path of the page, such as `/button` or `/structure/box`. */
	path: string
	/** The name of the page in the sidebar and in the header. */
	name: string
	/** The section of the page in the sidebar. */
	category: string
}

/**
 * The data that a demo exports as its `handle`, the route data of React
 * Router. Each field changes one field of its {@link Page}.
 */
export type PageHandle = { name?: string; category?: string }

// The folder of the components. Its pages have no folder in their path or id.
const COMPONENTS = 'components'

/**
 * Returns the page of a demo file. A file in `demos/components/` is at
 * `/<file>`, and a file in another folder is at `/<folder>/<file>`. The id
 * joins the parts with a hyphen. The folder is the section of the sidebar.
 */
export function pageOf(file: string, handle: PageHandle = {}): Page {
	const [folder = '', base = ''] = file
		.replace(/^.*?demos\//, '')
		.replace(/(\/index)?\.tsx$/, '')
		.split('/')

	const namespaced = folder !== COMPONENTS

	return {
		id: namespaced ? `${folder}-${base}` : base,
		path: namespaced ? `/${folder}/${base}` : `/${base}`,
		name: handle.name ?? pascalCase(base),
		category: handle.category ?? folder,
	}
}

/** Orders pages by name, as the sidebar lists them. */
export function byName(a: Page, b: Page): number {
	return a.name.localeCompare(b.name)
}

/**
 * Returns the page that shows a path: the page at the path, or the page of a
 * tab below it. The root path shows the first page.
 */
export function pageAt(pages: readonly Page[], pathname: string): Page | undefined {
	if (pathname === '/') return pages[0]

	return pages.find((page) => pathname === page.path || pathname.startsWith(`${page.path}/`))
}
