'use client'

import { type DOMAttributes, type RefObject, useCallback, useRef } from 'react'

/** The key handlers that {@link useGridEditPick} gives the editor host. @internal */
export type GridEditPickKeys = Pick<DOMAttributes<HTMLElement>, 'onKeyDownCapture' | 'onKeyDown'>

/**
 * Commits the pick of a choice editor in the cell that a cell-scoped session
 * holds, as F2 does. `host` is the editor host of the cell. The hook returns
 * `pick`, which takes the save of the session and runs it after it puts focus
 * where the save can reseat it, and `keys`, the key handlers for the host.
 *
 * @remarks A pick in the panel of a listbox leaves focus in the panel, outside
 * the grid, and the panel closes with the cell. The pick therefore gives
 * focus to the control that opened the panel first. The save then finds focus
 * in the grid and puts it back on the tab stop.
 *
 * Tab in an open panel picks the active option, and then commits the cell and
 * moves along the row on the key surface of the grid (see `useGridEditKeys`).
 * That pick does not save, so the cell commits once and Tab still moves. The
 * panel is in a portal, but its key events go up the React tree through the
 * host. So `keys` sees each key of the editor and of its panel: first in the
 * capture phase, before the option picks, and last in the bubble phase,
 * before the key surface of the grid.
 *
 * @internal
 */
export function useGridEditPick(host: RefObject<HTMLElement | null>): {
	pick: (save: () => void) => void
	keys: GridEditPickKeys
} {
	// Whether a Tab press is on its way to the key surface of the grid.
	const tabbingRef = useRef(false)

	const pick = useCallback(
		(save: () => void) => {
			if (tabbingRef.current) return

			const node = host.current

			const opener = node?.querySelector<HTMLElement>('[aria-expanded="true"]')

			if (opener && !node?.contains(document.activeElement)) opener.focus()

			save()
		},
		[host],
	)

	return {
		pick,
		keys: {
			onKeyDownCapture: (event) => {
				tabbingRef.current = event.key === 'Tab'
			},
			onKeyDown: () => {
				tabbingRef.current = false
			},
		},
	}
}
