'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'
import { matchesMediaQuery } from '../../utilities'
import type { DashboardOffset } from './engine/dashboard-drag'
import { type DashboardCell, inlineSign, ROW_SUBDIVISION } from './engine/dashboard-layout'

/** The duration of a tile glide, in ms. */
const GLIDE_DURATION = 200

/** The easing of a tile glide: a fast start that settles softly. */
const GLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * The z-index of a tile while it glides. It is over the chrome of the later
 * tiles at 10, and under the lifted tile at 30. A dropped tile has lost its
 * raise, so without it the later tiles paint over the glide.
 */
const GLIDE_LAYER = 20

/** The query that matches when the reader asks the platform for reduced motion. */
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Options for {@link useDashboardFlip}. @internal */
export type DashboardFlipOptions = {
	/** The cell that the tile paints now. */
	cell: DashboardCell | undefined
	/** The pointer offset while the tile is dragged, else `null`. */
	carried: DashboardOffset | null
	/** Snap instead of glide, for a responsive re-pack. */
	snap: boolean
}

/** The translate that an element paints now, which a running animation can hold. */
function paintedOffset(element: HTMLElement): DashboardOffset {
	const transform = getComputedStyle(element).transform

	if (!transform || transform === 'none') return { x: 0, y: 0 }

	const matrix = new DOMMatrixReadOnly(transform)

	return { x: matrix.m41, y: matrix.m42 }
}

/** What the tile painted at its last commit. */
type Painted = { cell: DashboardCell; carried: DashboardOffset | null; snap: boolean }

/**
 * The offset in px from the new cell back to where the tile was painted, or
 * `null` when the change snaps. A change of size snaps, and so does each change
 * that starts or ends a snap phase. Only a change that can glide reads the
 * width and the direction of the tile.
 */
function glideFrom(
	previous: Painted,
	cell: DashboardCell,
	snap: boolean,
	element: HTMLElement,
): DashboardOffset | null {
	if (snap || previous.snap) return null

	if (previous.cell.w !== cell.w || previous.cell.h !== cell.h) return null

	const { carried } = previous

	if (previous.cell.x === cell.x && previous.cell.y === cell.y && carried === null) return null

	const pitch = element.offsetWidth / cell.w

	// The columns turn into px on the screen, which run the other way in a right-to-left board.
	const inline = inlineSign(getComputedStyle(element).direction)

	const x = inline * (previous.cell.x - cell.x) * pitch + (carried?.x ?? 0)

	const y = ((previous.cell.y - cell.y) * pitch) / ROW_SUBDIVISION + (carried?.y ?? 0)

	return x === 0 && y === 0 ? null : { x, y }
}

/** Ends each glide that runs on the tile. A host with no Web Animations API runs none. */
function endGlides(element: HTMLElement): void {
	for (const animation of element.getAnimations?.() ?? []) animation.cancel()
}

/** Plays one glide from `offset` to rest, from the painted position of any glide that runs. */
function glide(element: HTMLElement, offset: DashboardOffset): void {
	if (typeof element.animate !== 'function' || matchesMediaQuery(REDUCED_MOTION)) return

	const running = paintedOffset(element)

	endGlides(element)

	element.animate(
		[
			{
				transform: `translate(${offset.x + running.x}px, ${offset.y + running.y}px)`,
				zIndex: GLIDE_LAYER,
			},
			{ transform: 'translate(0px, 0px)', zIndex: GLIDE_LAYER },
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
 * position of a glide that runs, so a quick run of previews never jumps. A
 * pickup ends a glide that runs, so the tile follows the pointer at once.
 *
 * While it glides, a tile sits at z-index 20 in the stacking context of the
 * board. Outside edit mode, a glide can therefore pass over app chrome at 10 to 19.
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

		if (element === null || previous === null || cell === undefined) return

		// A carried tile follows the pointer, and it glides only once the pointer lets
		// go. A glide overrides the transform of the carry, so a pickup ends it.
		if (carried !== null) {
			if (previous.carried === null) endGlides(element)

			return
		}

		const offset = glideFrom(previous, cell, snap, element)

		if (offset !== null) glide(element, offset)
	}, [ref, cell, carried, snap])
}
