import { Search } from 'lucide-react'
import { type ReactNode, use, useMemo, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { createContext } from 'ui/core'
import { useIntentLoad } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Kbd } from 'ui/kbd'
import { defineMessages, IntlMessage } from 'ui/primitives/intl'
import { OffcanvasContext } from 'ui/primitives/offcanvas'
import { useStableEvent } from '../../hooks/use-stable-event.ts'
import { useFail } from '../kit/fail.ts'
import { ShortcutHint } from '../kit/shortcut-hint.tsx'

// The part of the search that the shell loads with each page: the state, the
// button in the sidebar, and the place of the palette. The palette and the
// entries load in idle time after the hydration, or when the reader points at
// the button. The palette binds its key when it loads. When the load that a
// press asks for fails, the error boundary of the shell shows the failure.

const loadPalette = () => import('./search-palette.tsx')

type SearchState = {
	open: boolean
	setOpen: (open: boolean) => void
	/** The palette module, once it loads. */
	palette: Awaited<ReturnType<typeof loadPalette>> | undefined
	/**
	 * Opens the palette, after its module loads. `onPick` runs after a pick in
	 * this open, such as the close of the mobile sidebar that holds the button.
	 */
	request: (onPick?: () => void) => void
	preload: () => void
	/** Runs the `onPick` of the last request. */
	pick: () => void
}

const [SearchContext, useSearch] = createContext<SearchState>('DocsSearch')

const messages = defineMessages({
	button: {
		id: 'docs.search.button',
		defaultMessage: 'Search docs',
		description:
			'The label of the button at the top of the sidebar that opens the search of the docs.',
	},
})

/**
 * Holds the state of the search for the shell. The button is in the sidebar
 * and the palette is in the main column, so the state is above both.
 */
export function DocsSearch({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false)

	const { module: palette, request: load, preload } = useIntentLoad(loadPalette)

	const onPickRef = useRef<(() => void) | undefined>(undefined)

	const fail = useFail()

	// A failure goes to the error boundary, which offers a reload, as for each
	// load that the reader asks for.
	const request = useStableEvent((onPick?: () => void) => {
		onPickRef.current = onPick

		load(() => setOpen(true), fail)
	})

	const pick = useStableEvent(() => onPickRef.current?.())

	const state = useMemo(
		() => ({ open, setOpen, palette, request, preload, pick }),
		[open, palette, request, preload, pick],
	)

	return <SearchContext value={state}>{children}</SearchContext>
}

/**
 * The button that opens the search, with its key ({@link ShortcutHint}). A pick
 * closes the mobile sidebar, as a pick of an item of the sidebar does.
 */
export function SearchButton() {
	const { request, preload } = useSearch()

	const offcanvas = use(OffcanvasContext)

	return (
		<Button
			variant="outline"
			className="w-full justify-start font-normal text-zinc-500 dark:text-zinc-400"
			onPointerEnter={preload}
			onFocus={preload}
			onClick={() => request(offcanvas?.close)}
		>
			<Icon icon={<Search />} />
			<span className="flex-1 text-start">
				<IntlMessage message={messages.button} />
			</span>
			<Kbd className="hidden lg:inline-flex">
				<ShortcutHint keyName="K" />
			</Kbd>
		</Button>
	)
}

/**
 * The place of the palette, in the main column of the layout. It stays
 * mounted while the mobile sidebar is closed, so the key opens it.
 */
export function SearchPaletteHost() {
	const { open, setOpen, palette, pick } = useSearch()

	if (!palette) return null

	return <palette.SearchPalette open={open} onOpenChange={setOpen} onPick={pick} />
}
