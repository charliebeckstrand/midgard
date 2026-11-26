// The contract of the search of the docs. The build writes the entries
// (`build/`), the engine finds them (`engine/`), and the shell shows them
// (`ui/`). Each layer imports these types, and no layer imports a layer above
// it.

/** What an entry of the search is. */
export type SearchKind = 'page' | 'tab' | 'example' | 'component' | 'prop' | 'event'

/** One entry of the search of the docs. */
export type SearchEntry = {
	kind: SearchKind
	/** The name of the entry, such as `Button`, `With icon`, or `variant`. */
	label: string
	/** The path of the entry, with the hash of its anchor, such as `/button#with-icon`. */
	href: string
	/** Where the entry is: the section of a page, the page of a tab or an example, or the component of a prop. */
	context: string
}
