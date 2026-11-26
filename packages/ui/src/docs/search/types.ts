// The contract of the search of the docs. The build writes the entries
// (`build/`), the engine finds them (`engine/`), and the shell shows them
// (`ui/`). Each layer imports these types, and no layer imports a layer above
// it.

/** What an entry of the search is. */
export type SearchKind = 'page' | 'tab' | 'component' | 'prop' | 'event'

/** One entry of the search of the docs. */
export type SearchEntry = {
	kind: SearchKind
	/** The name of the entry, such as `Button`, `Sorting`, or `variant`. */
	label: string
	/** The path of the entry, with the hash of its anchor, such as `/button#api-Button-variant`. */
	href: string
	/** Where the entry is: the section of a page, the page of a tab, or the component of a prop. */
	context: string
	/** The other words that find the entry, such as `modal` for the Dialog page (`keywords.ts`). */
	keywords?: readonly string[]
}
