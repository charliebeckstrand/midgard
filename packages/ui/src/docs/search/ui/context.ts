import { createContext } from 'ui/core'

/** The state of the search, which the button and the palette share. */
export type SearchState = {
	open: boolean
	/** Opens or closes the palette. A close clears the query. */
	setOpen: (open: boolean) => void
	/** The text in the search field of the palette. */
	query: string
	setQuery: (query: string) => void
	/** Opens the palette, after its module loads, with `query` in its search field. */
	request: (options?: { query?: string }) => void
	preload: () => void
}

// The provider is `DocsSearch` in `search-provider.tsx`.
export const [SearchContext, useSearch] = createContext<SearchState>('DocsSearch')
