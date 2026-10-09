'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { useIntentLoad, useKeybindings } from 'ui/hooks'
import { Icon } from 'ui/icon'
import type { PaletteSource } from '../../utilities/places-palette'

/**
 * Loads the module of the command palette, which carries the dialog and the
 * menu of a row. The page loads it in idle time after the hydration. Thus the
 * home page does not load that code before it hydrates, and the first open
 * does not wait for it.
 */
const loadPalette = () => import('./place-palette-panel')

/** Props for {@link PlacePalette}. */
export type PlacePaletteProps = {
	/** The groups, in the order that they show. */
	sources: readonly PaletteSource[]
}

/**
 * The search of the app: an icon button that opens a command palette over the
 * sources that it gets. The palette knows nothing of places. Each source gives
 * its commands, and a pick runs the command.
 *
 * ⌘K or Ctrl+K also opens the palette. The page does not show the shortcut.
 *
 * @remarks The palette loads in idle time after the hydration, and then
 * renders closed, so the first open is the same as a later open. A pointer on
 * the button or a focus on it starts the load sooner. A press or ⌘K before the
 * load opens the palette when the module arrives. Until the load, this
 * component holds ⌘K. After the load, the palette holds it.
 */
export function PlacePalette({ sources }: PlacePaletteProps) {
	const [open, setOpen] = useState(false)

	const { module: palette, request, preload } = useIntentLoad(loadPalette)

	const show = () => request(() => setOpen(true))

	useKeybindings(
		{
			'$mod+KeyK': (event) => {
				event.preventDefault()

				show()
			},
		},
		{ enabled: palette === undefined },
	)

	return (
		<>
			<Button
				variant="bare"
				aria-label="Search"
				onPointerEnter={preload}
				onPointerDown={preload}
				onFocus={preload}
				onClick={show}
			>
				<Icon icon={<Search />} />
			</Button>

			{palette && (
				<palette.PlacePalettePanel sources={sources} open={open} onOpenChange={setOpen} />
			)}
		</>
	)
}
