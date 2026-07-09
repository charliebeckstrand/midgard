// The pure route model behind the docs site's path routing: glob-key parsing,
// path formatting, and slug derivation. No DOM, no history — `router.ts` binds
// this model to the browser; keeping the model pure keeps it unit-testable.

/** One tab route within a demo: its URL slug (`''` for the index tab) and display name. */
export type TabRoute = { slug: string; name: string }

/**
 * One sidebar entry: a demo's id, display name, category, URL path (without a
 * leading slash), and its tab routes — empty for a single-page demo, index
 * first otherwise.
 */
export type Demo = { id: string; name: string; category: string; path: string; tabs: TabRoute[] }

/**
 * A demo glob key parsed into route coordinates: the demo `id` (the registry
 * and API-reference key), its `category` and path `label` (`path` is
 * `category/label`), and the page's tab `slug` (`''` for `index.tsx` and for
 * single-file demos).
 */
export type DemoGlobKey = { id: string; category: string; label: string; tab: string }

// Subfolders namespace the id with their category (`providers/toast` →
// `providers-toast`); `components/` is exempted — it's the explicit form of the
// top-level default, and bare ids (`button`) match the component's API
// reference key (`buildApi` keys the components root unprefixed).
function idFor(category: string, label: string): string {
	return category === 'components' ? label : `${category}-${label}`
}

/**
 * Parse a demo glob key (`./demos/…​.tsx`) into its route coordinates, or null
 * for a key the route model doesn't place (deeper than
 * `demos/<category>/<demo>/<tab>.tsx`).
 *
 * Shapes: a top-level file is a `components` demo; a file under a category
 * folder is that category's demo; a file under `<category>/<demo>/` is one tab
 * of that demo, with `index.tsx` the default (`''`) tab.
 */
export function parseDemoGlobKey(globPath: string): DemoGlobKey | null {
	const rel = globPath.replace(/^\.\/demos\//, '').replace(/\.tsx$/, '')

	const parts = rel.split('/')

	const file = parts[parts.length - 1] ?? ''

	if (parts.length === 1) {
		return { id: file, category: 'components', label: file, tab: '' }
	}

	if (parts.length === 2) {
		const category = parts[0] ?? ''

		// `<dir>/index.tsx` at category depth is a folder demo in the default
		// category (`./demos/grid/index.tsx` → components/grid).
		if (file === 'index') {
			const label = category

			return { id: label, category: 'components', label, tab: '' }
		}

		return { id: idFor(category, file), category, label: file, tab: '' }
	}

	if (parts.length === 3) {
		const category = parts[0] ?? ''

		const label = parts[1] ?? ''

		return { id: idFor(category, label), category, label, tab: file === 'index' ? '' : file }
	}

	return null
}

/**
 * Parse a layout glob key (`./demos/…​/layout.tsx`) into the id of the demo it
 * wraps, or null when the layout sits at a depth the route model doesn't place.
 * A layout is a folder-level file: `demos/<category>/<demo>/layout.tsx` (or
 * `demos/<demo>/layout.tsx` for the default category).
 */
export function parseLayoutGlobKey(globPath: string): string | null {
	const rel = globPath.replace(/^\.\/demos\//, '')

	// A layout wraps a folder; `layout.tsx` directly under `demos/` has none.
	if (!rel.endsWith('/layout.tsx')) return null

	const key = parseDemoGlobKey(globPath.replace(/\/layout\.tsx$/, '/index.tsx'))

	// Parsed as the folder's index page: null (too deep) or a tab slug means the
	// layout sits at a depth the route model doesn't place.
	if (key?.tab !== '') return null

	return key.id
}

/** The app-relative href for a demo route: `/<category>/<label>` plus the tab segment when present. */
export function demoHref(demo: Pick<Demo, 'path'>, tab = ''): string {
	return `/${demo.path}${tab ? `/${tab}` : ''}`
}

/**
 * Parse an app-relative pathname into its demo path and tab slug. The root
 * (`''` or `/`) parses to an empty demo path — the caller's cue to fall back to
 * the default demo; a single segment resolves in the default `components`
 * category. Deeper than three segments is unroutable: null.
 */
export function parsePathname(pathname: string): { demoPath: string; tab: string } | null {
	const segments = pathname.split('/').filter(Boolean)

	if (segments.length === 0) return { demoPath: '', tab: '' }

	if (segments.length === 1) return { demoPath: `components/${segments[0]}`, tab: '' }

	if (segments.length === 2) return { demoPath: segments.join('/'), tab: '' }

	if (segments.length === 3)
		return { demoPath: `${segments[0]}/${segments[1]}`, tab: segments[2] ?? '' }

	return null
}

/**
 * Derive a URL-safe slug from display text: lowercase, runs of non-alphanumerics
 * collapsed to single hyphens, no leading or trailing hyphen. `'Server
 * grouping'` → `'server-grouping'`.
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}
