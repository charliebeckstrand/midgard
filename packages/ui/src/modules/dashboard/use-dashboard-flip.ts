'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'
import { type DashboardCell, inlineSign, ROW_SUBDIVISION } from './engine/dashboard-layout'

/** The duration of a tile glide, in ms. */
const GLIDE_DURATION = 200

/** The easing of a tile glide: a fast start that settles softly. */
const GLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** A pointer offset in px. */
type Offset = { x: number; y: number }

/** Options for {@link useDashboardFlip}. @internal */
export type DashboardFlipOptions = {
	/** The cell that the tile paints now. */
	cell: DashboardCell | undefined
	/** The pointer offset while the tile is dragged, else `null`. */
	carried: Offset | null
	/** Snap instead of glide, for a responsive re-pack. */
	snap: boolean
}

/** The translate that an element paints now, which a running animation can hold. */
function paintedOffset(element: HTMLElement): Offset {
	const transform = getComputedStyle(element).transform

	if (!transform || transform === 'none') return { x: 0, y: 0 }

	const matrix = new DOMMatrixReadOnly(transform)

	return { x: matrix.m41, y: matrix.m42 }
}

/** Whether the reader asks the platform for reduced motion. */
function prefersReducedMotion(): boolean {
	return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** What the tile painted at its last commit. */
type Painted = { cell: DashboardCell; carried: Offset | null; snap: boolean }

/**
 * The offset in px from the new cell back to where the tile was painted, or
 * `null` when the change snaps. A change of size snaps, and so does each change
 * that starts or ends a snap phase.
 */
function glideFrom(
	previous: Painted,
	cell: DashboardCell,
	snap: boolean,
	pitch: number,
	inline: 1 | -1,
): Offset | null {
	if (snap || previous.snap) return null

	if (previous.cell.w !== cell.w || previous.cell.h !== cell.h) return null

	// The columns turn into px on the screen, which run the other way in a right-to-left board.
	const x = inline * (previous.cell.x - cell.x) * pitch + (previous.carried?.x ?? 0)

	const y = ((previous.cell.y - cell.y) * pitch) / ROW_SUBDIVISION + (previous.carried?.y ?? 0)

	return x === 0 && y === 0 ? null : { x, y }
}

/** Plays one glide from `offset` to rest, from the painted position of any glide that runs. */
function glide(element: HTMLElement, offset: Offset): void {
	if (typeof element.animate !== 'function' || prefersReducedMotion()) return

	const running = paintedOffset(element)

	for (const animation of element.getAnimations()) animation.cancel()

	element.animate(
		[
			{ transform: `translate(${offset.x + running.x}px, ${offset.y + running.y}px)` },
			{ transform: 'translate(0px, 0px)' },
		],
		{ duration: GLIDE_DURATION, easing: GLIDE_EASING },
	)
}

/**
 * Glides a tile from where it was painted to its new cell. CSS cannot animate a
 * change of grid position, so the tile plays the inverse offset as one transform
 * through the Web Animations API.
 *
 * The offset comes from grid units and from the pitch that the tile measures on
 * itself now. A stored pixel position is never read, so a resize of the container
 * between two moves cannot cause a wrong glide. A dropped tile adds the pointer
 * offset that it carried, so it settles from exactly where the pointer let go.
 *
 * Only a move glides. A change of size snaps, a responsive re-pack snaps, and so
 * does each change under reduced motion. A new glide starts from the painted
 * position of a glide that runs, so a quick run of previews never jumps.
 *
 * @internal
 */
export function useDashboardFlip(
	ref: RefObject<HTMLElement | null>,
	{ cell, carried, snap }: DashboardFlipOptions,
): void {
	const last = useRef<Painted | null>(null)

	useLayoutEffect(() => {
		const element = ref.current

		const previous = last.current

		if (cell !== undefined) last.current = { cell, carried, snap }

		// A carried tile follows the pointer; it glides only once the pointer lets go.
		if (element === null || previous === null || cell === undefined || carried !== null) return

		const inline = inlineSign(getComputedStyle(element).direction)

		const offset = glideFrom(previous, cell, snap, element.offsetWidth / cell.w, inline)

		if (offset !== null) glide(element, offset)
	}, [ref, cell, carried, snap])
}
