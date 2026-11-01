'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'

/**
 * Commits the pick of a choice editor in the cell that a cell-scoped session
 * holds, as F2 does. `host` is the editor host of the cell, and `holds` tells
 * whether the session holds the cell. The returned function takes the save of
 * the session, and runs it after it puts focus where the save can reseat it.
 *
 * @remarks A pick in the panel of a listbox leaves focus in the panel, outside
 * the grid, and the panel closes with the cell. The pick therefore gives
 * focus to the control that opened the panel first. The save then finds focus
 * in the grid and puts it back on the tab stop.
 *
 * Tab in an open panel picks the active option, and then commits the cell and
 * moves along the row on the key surface of the grid (see `useGridEditKeys`).
 * That pick does not save, so the cell commits once and Tab still moves. The
 * panel is in a portal, so the document sees its keys: first in the capture
 * phase, and last in the bubble phase. The hook listens there while the
 * session holds the cell.
 *
 * @internal
 */
export function useGridEditPick(
	host: RefObject<HTMLElement | null>,
	holds: boolean,
): (save: () => void) => void {
	// Whether a Tab press is on its way to the key surface of the grid.
	const tabbingRef = useRef(false)

	useEffect(() => {
		if (!holds) return

		const press = (event: KeyboardEvent) => {
			tabbingRef.current = event.key === 'Tab'
		}

		const done = () => {
			tabbingRef.current = false
		}

		document.addEventListener('keydown', press, true)

		document.addEventListener('keydown', done)

		return () => {
			document.removeEventListener('keydown', press, true)

			document.removeEventListener('keydown', done)
		}
	}, [holds])

	return useCallback(
		(save: () => void) => {
			if (tabbingRef.current) return

			const node = host.current

			const opener = node?.querySelector<HTMLElement>('[aria-expanded="true"]')

			if (opener && !node?.contains(document.activeElement)) opener.focus()

			save()
		},
		[host],
	)
}
