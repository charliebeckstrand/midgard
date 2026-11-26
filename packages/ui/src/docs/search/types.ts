// The contract of the search of the docs. The build writes the entries
// (`build/`), the engine finds them (`engine/`), and the shell shows them
// (`ui/`). Each layer imports these types, and no layer imports a layer above
// it.

/** What an entry of the search is. */
export type SearchKind = 'page' | 'tab' | 'component'

/** One entry of the search of the docs. */
export type SearchEntry = {
	kind: SearchKind
	/** The name of the entry, such as `Button`, `Sorting`, or `<Button />`. */
	label: string
	/** The path of the entry, with the hash of its anchor, such as `/button#api-Button`. */
	href: string
	/** Where the entry is: the section of a page, or the page of a tab or a component. */
	context: string
	/** The other words that find the entry, such as `modal` for the Dialog page (`keywords.ts`). */
	keywords?: readonly string[]
	/**
	 * The names of the props and the events of a component, such as `variant`
	 * and `onClick`. A query finds the component from them, and the anchor of
	 * each is the anchor of the component, then a hyphen and the name.
	 */
	members?: readonly string[]
}
