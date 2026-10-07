'use client'

import { type MouseEvent, useMemo } from 'react'
import { createEmitter } from '../../utilities'

/**
 * The fill handle of a grid that can fill. The active cell holds it, and one
 * overlay shows it on the corner of that cell (see `GridFillHandle`). The handle
 * is not in the cell, so a move of the cursor does not change the layout of
 * the table.
 *
 * @internal
 */
export type GridFillHandle = {
	/** Starts the drag of the fill across the cells of `grid`, for the press on the handle. */
	press: (event: MouseEvent<HTMLElement>, grid: HTMLElement | null) => void
	/** Shows the handle on the cell, until the returned release runs. */
	hold: (cell: HTMLElement) => () => void
	/** Places the handle on its cell again, because a render of the cell can move it. */
	place: () => void
	/** The cell that holds the handle, or `null` for none. */
	cell: () => HTMLElement | null
	subscribe: (listener: () => void) => () => void
	/**
	 * Sets the function that places the overlay on the cell, until the returned
	 * release runs. The overlay sets it for each cell that it shows.
	 */
	placeWith: (place: () => void) => () => void
}

/**
 * The fill handle for the press `press`, or `null` when the grid cannot fill.
 * Each grid makes one, and the cursor store gives it to the cells.
 *
 * @param press - The start of the fill drag, or `null` when the grid cannot fill.
 * @returns The fill handle, or `null`.
 * @internal
 */
export function useGridFillHandle(press: GridFillHandle['press'] | null): GridFillHandle | null {
	return useMemo(() => (press ? createGridFillHandle(press) : null), [press])
}

/** A fill handle for the press `press`. @internal */
function createGridFillHandle(press: GridFillHandle['press']): GridFillHandle {
	const { subscribe, emit } = createEmitter()

	let held: HTMLElement | null = null

	let place: (() => void) | null = null

	const set = (cell: HTMLElement | null) => {
		held = cell

		emit()
	}

	return {
		press,
		hold: (cell) => {
			if (held !== cell) set(cell)

			return () => {
				if (held === cell) set(null)
			}
		},
		place: () => place?.(),
		cell: () => held,
		subscribe,
		placeWith: (next) => {
			place = next

			return () => {
				if (place === next) place = null
			}
		},
	}
}
