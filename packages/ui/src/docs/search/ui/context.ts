import { createContext } from 'ui/core'

/** The state of the search, which the button and the palette share. */
export type SearchState = {
	open: boolean
	setOpen: (open: boolean) => void
	/**
	 * Opens the palette, after its module loads. `onPick` runs after a pick in
	 * this open, such as the close of the mobile sidebar that holds the button.
	 */
	request: (onPick?: () => void) => void
	preload: () => void
	/** Runs the `onPick` of the last request. */
	pick: () => void
}

// The provider is `DocsSearch` in `search-provider.tsx`.
export const [SearchContext, useSearch] = createContext<SearchState>('DocsSearch')
