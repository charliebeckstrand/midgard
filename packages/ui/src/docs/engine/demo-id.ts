import { DEMO_GLOBS } from '../app/demo-globs'

// Subfolders namespace the id with their folder (`pages/x` → `pages-x`,
// `providers/x` → `providers-x`); a provider demo and a component demo of the
// same name (e.g. Link) get distinct ids. `components/` is the one subfolder
// exempted: it's just the explicit form of the top-level default, so its ids
// stay bare (`components/button` → `button`) to match the component's API
// reference key (`buildApi` keys the components root unprefixed).
export function pathToId(path: string) {
	return path
		.replace(/^(\.\.?\/)?demos\//, '')
		.replace(/^components\//, '')
		.replace(/\/index\.tsx$/, '')
		.replace('.tsx', '')
		.replaceAll('/', '-')
}

// The demo folders that namespace a page: each folder of `DEMO_GLOBS` except
// `components/`, whose pages keep a bare id.
const NAMESPACES = new Set(
	DEMO_GLOBS.map((glob) => glob.split('/')[1]).filter((folder) => folder !== 'components'),
)

/** The namespaces of the demo pages, in the order of `DEMO_GLOBS`. */
export const namespaces = [...NAMESPACES]

/**
 * The path of the page `id`, and of its tab `tab` when one is given. A
 * namespaced page is a folder of the path (`structure-box` → `/structure/box`),
 * and any other page is at its id (`card` → `/card`). A tab adds one part
 * (`/progress/gauge`).
 */
export function demoPath(id: string, tab?: string): string {
	const dash = id.indexOf('-')

	const page =
		dash > 0 && NAMESPACES.has(id.slice(0, dash))
			? `/${id.slice(0, dash)}/${id.slice(dash + 1)}`
			: `/${id}`

	return tab === undefined ? page : `${page}/${encodeURIComponent(tab)}`
}

/**
 * The page id and the tab of a path, the opposite of {@link demoPath}.
 * A path from before nested paths (`/structure-box`) gives the same id as its
 * new path. The root path gives an empty id.
 */
export function parseDemoPath(pathname: string): { id: string; tab: string | undefined } {
	const [first = '', ...rest] = pathname.split('/').filter(Boolean).map(decodeURIComponent)

	if (NAMESPACES.has(first) && rest.length > 0) {
		const [name, tab] = rest

		return { id: `${first}-${name}`, tab }
	}

	return { id: first, tab: rest[0] }
}

/** The path of the tab `value` on the page `id`. The default tab has the page's own path. */
export function pageTabPath(id: string, value: string, defaultValue: string): string {
	return demoPath(id, value === defaultValue ? undefined : value)
}
