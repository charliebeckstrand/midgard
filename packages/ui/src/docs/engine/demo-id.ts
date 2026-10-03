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

/** The path of the tab `value` on the page `id`. The default tab has the page's own path. */
export function pageTabPath(id: string, value: string, defaultValue: string): string {
	return value === defaultValue ? `/${id}` : `/${id}/${encodeURIComponent(value)}`
}
