'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { type RefObject, useLayoutEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/dashboard'
import type { DashboardOffset } from './engine/dashboard-drag'
import { type DashboardCell, inlineSign, ROW_SUBDIVISION } from './engine/dashboard-layout'

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

/** The glide that runs on a tile, else `null`. */
type Running = RefObject<AnimationPlaybackControls | null>

/**
 * Ends the glide that runs on the tile. The cancel commits no frame of the glide,
 * so the transform of a carry that started in the same commit stays.
 */
function endGlide(element: HTMLElement, running: Running): void {
	running.current?.cancel()

	running.current = null

	delete element.dataset.gliding
}

/** Plays one glide from `offset` to rest, from the painted position of any glide that runs. */
function glide(element: HTMLElement, offset: DashboardOffset, running: Running): void {
	const painted = paintedOffset(element)

	endGlide(element, running)

	element.dataset.gliding = ''

	// The tile rests at `transform: none`. A transform of zero still makes the tile
	// a containing block and a stacking context.
	const controls = animate(
		element,
		{
			transform: [
				`translate(${offset.x + painted.x}px, ${offset.y + painted.y}px)`,
				'translate(0px, 0px)',
			],
			transitionEnd: { transform: 'none' },
		},
		k.motion.glide,
	)

	running.current = controls

	// A glide that ends early never finishes, and the next glide or the pickup owns the tile.
	controls.finished.then(() => {
		if (running.current === controls) endGlide(element, running)
	})
}

/**
 * Glides a tile from where it was painted to its new cell. CSS cannot animate a
 * change of grid position, so the tile plays the inverse offset as one transform
 * through Motion, on the `glide` tween of ugoki.
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
 * While it glides, a tile sits at z-index 20. The board opens no stacking
 * context, so a glide can pass over app chrome at 10 to 19 for its 200 ms.
 *
 * @internal
 */
export function useDashboardFlip(
	ref: RefObject<HTMLElement | null>,
	{ cell, carried, snap }: DashboardFlipOptions,
): void {
	const last = useRef<Painted | null>(null)

	const running = useRef<AnimationPlaybackControls | null>(null)

	const reduceMotion = usePrefersReducedMotion()

	useLayoutEffect(() => {
		const element = ref.current

		const previous = last.current

		if (cell !== undefined) last.current = { cell, carried, snap }

		if (element === null || previous === null || cell === undefined) return

		// A carried tile follows the pointer, and it glides only once the pointer lets
		// go. A glide overrides the transform of the carry, so a pickup ends it.
		if (carried !== null) {
			if (previous.carried === null) endGlide(element, running)

			return
		}

		const offset = reduceMotion ? null : glideFrom(previous, cell, snap, element)

		if (offset !== null) glide(element, offset, running)
	}, [ref, cell, carried, snap, reduceMotion])
}
