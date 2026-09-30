'use client'

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { GRID_ROLE } from './engine/grid-constants'
import type { GridFillHandle as GridFillHandleStore } from './use-grid-fill-handle'
import { useGridNavContext } from './use-grid-navigation'

/**
 * The fill handle of a grid that can fill, on the bottom end corner of the
 * active cell. One overlay in the scroll container of the table shows it, and
 * the grid places the overlay from the box of the cell. The handle is not in
 * the cell, so a move of the cursor does not change the layout of the table.
 * Renders nothing while the grid cannot fill or no cell holds the handle.
 *
 * @internal
 */
export function GridFillHandle() {
	const { fillHandle } = useGridNavContext()

	if (!fillHandle) return null

	return <GridFillHandleOverlay handle={fillHandle} />
}

/** The overlay of {@link GridFillHandle}, for a grid that can fill. @internal */
function GridFillHandleOverlay({ handle }: { handle: GridFillHandleStore }) {
	const cell = useSyncExternalStore(handle.subscribe, handle.cell, () => null)

	const boxRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const box = boxRef.current

		const anchor = box?.parentElement

		if (!cell || !box || !anchor) return

		return trackCell(cell, box, anchor, handle)
	}, [cell, handle])

	// The overlay goes in the scroll container of the table, next to the table,
	// so it scrolls with the cells.
	const host = cell?.closest('table')?.parentElement

	if (!host) return null

	return createPortal(
		<div className={cn(k.nav.fillAnchor)}>
			<div ref={boxRef} className={cn(k.nav.fillBox)}>
				<span
					data-slot="grid-fill-handle"
					aria-hidden="true"
					className={cn(k.nav.fillHandle)}
					onMouseDown={(event) => handle.press(event, cell.closest(GRID_ROLE))}
				/>
			</div>
		</div>,
		host,
	)
}

/**
 * Keeps the box of the overlay on the cell: at once, when the cell, its row, or
 * the table changes size, and when the cell renders again. A pinned cell stays
 * in place as the grid scrolls, so the box also follows each scroll then.
 *
 * @returns The release of the tracking.
 * @internal
 */
function trackCell(
	cell: HTMLElement,
	box: HTMLElement,
	anchor: HTMLElement,
	handle: GridFillHandleStore,
): () => void {
	const pinned = getComputedStyle(cell).position === 'sticky'

	// A pinned cell sits over the scrolled cells, and the box sits over it.
	box.toggleAttribute('data-pinned', pinned)

	const place = () => placeBox(box, anchor, cell)

	place()

	const observer = new ResizeObserver(place)

	for (const target of [cell, cell.parentElement, cell.closest('table')]) {
		if (target) observer.observe(target)
	}

	const scrollers = pinned
		? [anchor.parentElement, anchor.closest<HTMLElement>('[data-slot="grid-scroll"]')]
		: []

	for (const scroller of scrollers) scroller?.addEventListener('scroll', place, { passive: true })

	const releasePlace = handle.placeWith(place)

	return () => {
		releasePlace()

		observer.disconnect()

		for (const scroller of scrollers) scroller?.removeEventListener('scroll', place)
	}
}

/**
 * Places the box of the overlay on the padding box of the cell, where the
 * handle sat as a child of the cell. The anchor is the containing block of the
 * box. A write that does not change a value is skipped.
 *
 * @internal
 */
function placeBox(box: HTMLElement, anchor: HTMLElement, cell: HTMLElement): void {
	const from = anchor.getBoundingClientRect()

	const to = cell.getBoundingClientRect()

	const borderX = cell.offsetWidth - cell.clientWidth

	const borderY = cell.offsetHeight - cell.clientHeight

	const x = to.left - from.left + cell.clientLeft

	const y = to.top - from.top + cell.clientTop

	setStyle(box, 'transform', `translate(${x}px, ${y}px)`)

	setStyle(box, 'width', `${to.width - borderX}px`)

	setStyle(box, 'height', `${to.height - borderY}px`)
}

/** Writes one inline style property of the box, when the value changes. @internal */
function setStyle(box: HTMLElement, name: 'transform' | 'width' | 'height', value: string): void {
	if (box.style[name] !== value) box.style[name] = value
}
