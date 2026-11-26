import { type ReactNode, useMemo, useRef, useState } from 'react'
import { useIdleLoad, useIntentLoad } from 'ui/hooks'
import { useFail } from '../../../hooks/use-fail.ts'
import { useStableEvent } from '../../../hooks/use-stable-event.ts'
import { SearchContext, useSearch } from './context.ts'

// The part of the search that the shell loads with each page: the state and
// the place of the palette. The button in the sidebar is in
// `search-button.tsx`. The palette and the entries load in idle time after the
// hydration, or when the reader points at the button. The palette binds its
// key when it loads. When the load that a press asks for fails, the error
// boundary of the shell shows the failure.

const loadPalette = () => import('./search-palette.tsx')

/**
 * Holds the state of the search for the shell. The button is in the sidebar
 * and the palette is in the main column, so the state is above both.
 */
export function DocsSearch({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false)

	const { request: load, preload } = useIntentLoad(loadPalette)

	const onPickRef = useRef<(() => void) | undefined>(undefined)

	const fail = useFail()

	// A failure goes to the error boundary, which offers a reload, as for each
	// load that the reader asks for.
	const request = useStableEvent((onPick?: () => void) => {
		onPickRef.current = onPick

		load(() => setOpen(true), fail)
	})

	const pick = useStableEvent(() => onPickRef.current?.())

	// The value does not hold the palette module, so the load in idle time does
	// not change it. A new value reaches each Suspense boundary of the page that
	// did not hydrate yet, and React then hydrates each one at once.
	const state = useMemo(
		() => ({ open, setOpen, request, preload, pick }),
		[open, request, preload, pick],
	)

	return <SearchContext value={state}>{children}</SearchContext>
}

/**
 * The place of the palette, in the main column of the layout. It stays
 * mounted while the mobile sidebar is closed, so the key opens it.
 */
export function SearchPaletteHost() {
	const { open, setOpen, pick } = useSearch()

	const palette = useIdleLoad(loadPalette)

	if (!palette) return null

	return <palette.SearchPalette open={open} onOpenChange={setOpen} onPick={pick} />
}
