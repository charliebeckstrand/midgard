import { createContext } from 'ui/core'

/** The state of the search, which the button and the palette share. */
export type SearchState = {
	open: boolean
	/** Opens or closes the palette. A close clears the query. */
	setOpen: (open: boolean) => void
	/** The text in the search field of the palette. */
	query: string
	setQuery: (query: string) => void
	/**
	 * Opens the palette, after its module loads, with `query` in its search
	 * field. `onPick` runs after a pick in this open, such as the close of the
	 * mobile sidebar that holds the button.
	 */
	request: (options?: { query?: string; onPick?: () => void }) => void
	preload: () => void
	/** Runs the `onPick` of the last request. */
	pick: () => void
}

// The provider is `DocsSearch` in `search-provider.tsx`.
export const [SearchContext, useSearch] = createContext<SearchState>('DocsSearch')
