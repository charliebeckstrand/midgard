// The other words that find a page: a common name of a pattern, such as
// "modal", or a capability that is not a prop, such as "dark mode". A prop is
// an entry of its own, so do not add the name of a prop here. Each key is a
// word or a phrase in lower case, and each value is the paths of the pages
// that the word finds. The build stops when a path is not the path of a page.

/** The pages that each word finds. */
export const KEYWORDS: Readonly<Record<string, readonly string[]>> = {
	autocomplete: ['/combobox'],
	typeahead: ['/combobox'],
	creatable: ['/combobox'],
	dropdown: ['/menu', '/select', '/combobox', '/listbox'],
	submenu: ['/menu', '/context-menu'],
	modal: ['/dialog', '/sheet', '/drawer', '/confirm'],
	overlay: ['/dialog', '/sheet', '/drawer', '/popover'],
	notification: ['/toast', '/alert', '/banner'],
	snackbar: ['/toast'],
	'toggle button': ['/icon-button'],
	spinner: ['/loading'],
	loader: ['/loading'],
	'empty state': ['/placeholder'],
	wizard: ['/stepper'],
	chips: ['/tag-input'],
	'color picker': ['/color'],
	'data table': ['/table', '/modules/grid'],
	datagrid: ['/modules/grid'],
	spreadsheet: ['/modules/grid'],
	graph: ['/modules/chart'],
	'drag and drop': ['/modules/kanban'],
	'rich text': ['/modules/wysiwyg'],
	editor: ['/modules/wysiwyg'],
	'dark mode': ['/providers/appearance'],
	theme: ['/providers/appearance'],
	rtl: ['/providers/locale'],
	i18n: ['/primitives/intl', '/providers/locale'],
	translation: ['/primitives/intl'],
	layout: [
		'/layouts/auth-layout',
		'/layouts/dashboard-layout',
		'/layouts/sidebar-layout',
		'/layouts/stacked-layout',
	],
}

/**
 * The words of {@link KEYWORDS} for each page, by the path of the page. A path
 * that `paths` does not hold is an error, so a keyword cannot point to a page
 * that moved.
 */
export function keywordsByPath(paths: ReadonlySet<string>): ReadonlyMap<string, readonly string[]> {
	const byPath = new Map<string, string[]>()

	for (const [word, targets] of Object.entries(KEYWORDS)) {
		for (const target of targets) {
			if (!paths.has(target))
				throw new Error(`The search keyword "${word}" names no page: ${target}`)

			byPath.set(target, [...(byPath.get(target) ?? []), word])
		}
	}

	return byPath
}
