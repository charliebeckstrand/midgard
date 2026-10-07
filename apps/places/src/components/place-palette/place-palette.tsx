'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { useKeybindings } from 'ui/hooks'
import { Icon } from 'ui/icon'
import type { PaletteSource } from '../../utilities/places-palette'
import type { PlacePalettePanel } from './place-palette-panel'

/**
 * Loads the module of the command palette, which carries the dialog and the
 * menu of a row. The page loads it on the first open, so the home page does not
 * load the dialog and the menu code before it hydrates.
 */
const loadPalette = () => import('./place-palette-panel')

/** Starts the load for a reader who shows intent: a pointer or a focus on the button. */
const preloadPalette = () => void loadPalette()

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
 * @remarks The palette loads on demand. A pointer on the button or a focus on
 * it starts the load, and a press or ⌘K opens the palette when the module is
 * there. Until then, this component holds ⌘K. After the load, the palette
 * holds it.
 */
export function PlacePalette({ sources }: PlacePaletteProps) {
	const [open, setOpen] = useState(false)

	// The module of the palette, from the first open on.
	const [palette, setPalette] = useState<{ PlacePalettePanel: typeof PlacePalettePanel } | null>(
		null,
	)

	const show = () => {
		void loadPalette().then((module) => {
			setPalette(module)

			setOpen(true)
		})
	}

	useKeybindings(
		{
			'$mod+KeyK': (event) => {
				event.preventDefault()

				show()
			},
		},
		{ enabled: palette === null },
	)

	return (
		<>
			<Button
				variant="plain"
				aria-label="Search"
				onPointerEnter={preloadPalette}
				onPointerDown={preloadPalette}
				onFocus={preloadPalette}
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
