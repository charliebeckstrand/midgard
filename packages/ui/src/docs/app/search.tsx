import { Search } from 'lucide-react'
import { type ReactNode, use, useMemo, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { createContext } from 'ui/core'
import { useIdleLoad, useIntentLoad } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { Kbd } from 'ui/kbd'
import { defineMessages, IntlMessage } from 'ui/primitives/intl'
import { OffcanvasContext } from 'ui/primitives/offcanvas'
import { useFail } from '../../hooks/use-fail.ts'
import { useStableEvent } from '../../hooks/use-stable-event.ts'
import { ShortcutHint } from '../kit/shortcut-hint.tsx'
import { useShortcutPlatformKeys } from '../kit/use-shortcut-platform.ts'

// The part of the search that the shell loads with each page: the state, the
// button in the sidebar, and the place of the palette. The palette and the
// entries load in idle time after the hydration, or when the reader points at
// the button. The palette binds its key when it loads. When the load that a
// press asks for fails, the error boundary of the shell shows the failure.

const loadPalette = () => import('./search-palette.tsx')

type SearchState = {
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

const [SearchContext, useSearch] = createContext<SearchState>('DocsSearch')

const messages = defineMessages({
	button: {
		id: 'docs.search.button',
		defaultMessage: 'Search',
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
 * The button that opens the search, with its key ({@link ShortcutHint}). A pick
 * closes the mobile sidebar, as a pick of an item of the sidebar does.
 */
export function SearchButton() {
	const { request, preload } = useSearch()

	const offcanvas = use(OffcanvasContext)

	const keys = useShortcutPlatformKeys('K')

	// The label is zinc-600, because zinc-500 is 4.4:1 on the gray of the sidebar,
	// under the 4.5:1 of small text. The key is in `aria-keyshortcuts`, so the
	// glyph of the hint is not part of the name.
	return (
		<Button
			variant="outline"
			className="w-full justify-start font-normal text-zinc-600 dark:text-zinc-400"
			aria-keyshortcuts={keys}
			onPointerEnter={preload}
			onFocus={preload}
			onClick={() => request(offcanvas?.close)}
		>
			<Icon icon={<Search />} />
			<span className="flex-1 text-start">
				<IntlMessage message={messages.button} />
			</span>
			<Kbd aria-hidden className="hidden lg:inline-flex">
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
	const { open, setOpen, pick } = useSearch()

	const palette = useIdleLoad(loadPalette)

	if (!palette) return null

	return <palette.SearchPalette open={open} onOpenChange={setOpen} onPick={pick} />
}
