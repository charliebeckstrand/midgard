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
	/**
	 * Whether a gesture in the re-pack runs. Its moves glide, from the layout box
	 * that the tile measures.
	 */
	stacked: boolean
}

/** The translate that an element paints now, which a running animation can hold. */
function paintedOffset(el: HTMLElement): DashboardOffset {
	const transform = getComputedStyle(el).transform

	if (!transform || transform === 'none') return { x: 0, y: 0 }

	const matrix = new DOMMatrixReadOnly(transform)

	return { x: matrix.m41, y: matrix.m42 }
}

/**
 * What the tile painted at its last commit. In a gesture in the re-pack, `at` is
 * the position of its layout box in px, else `null`.
 */
type Painted = {
	cell: DashboardCell
	carried: DashboardOffset | null
	snap: boolean
	at: DashboardOffset | null
}

/**
 * The offset in px from the new layout box back to where the tile was painted,
 * in a gesture in the re-pack, or `null` when the change snaps. The rows of the
 * re-pack take the height of their tiles, so grid units do not give the move.
 * The gesture starts at a commit of each tile, so `prev.at` is fresh.
 */
function stackGlideFrom(
	prev: Painted,
	cell: DashboardCell,
	at: DashboardOffset,
): DashboardOffset | null {
	if (prev.at === null || prev.cell.w !== cell.w) return null

	const x = prev.at.x - at.x + (prev.carried?.x ?? 0)

	const y = prev.at.y - at.y + (prev.carried?.y ?? 0)

	return x === 0 && y === 0 ? null : { x, y }
}

/**
 * The offset in px from the new cell back to where the tile was painted, or
 * `null` when the change snaps. A change of size snaps, and so does each change
 * that starts or ends a snap phase. Only a change that can glide reads the
 * width and the direction of the tile.
 */
function glideFrom(
	prev: Painted,
	cell: DashboardCell,
	snap: boolean,
	el: HTMLElement,
): DashboardOffset | null {
	if (snap || prev.snap) return null

	if (prev.cell.w !== cell.w || prev.cell.h !== cell.h) return null

	const { carried } = prev

	if (prev.cell.x === cell.x && prev.cell.y === cell.y && carried === null) return null

	const pitch = el.offsetWidth / cell.w

	// The columns turn into px on the screen, which run the other way in a right-to-left board.
	const inline = inlineSign(getComputedStyle(el).direction)

	const x = inline * (prev.cell.x - cell.x) * pitch + (carried?.x ?? 0)

	const y = ((prev.cell.y - cell.y) * pitch) / ROW_SUBDIVISION + (carried?.y ?? 0)

	return x === 0 && y === 0 ? null : { x, y }
}

/** The position of the layout box of `el` in px, in a gesture in the re-pack, else `null`. */
function layoutAt(el: HTMLElement | null, stacked: boolean): DashboardOffset | null {
	return el !== null && stacked ? { x: el.offsetLeft, y: el.offsetTop } : null
}

/**
 * The offset of the glide from `prev` to `next`, or `null` when the change snaps.
 * Each change snaps under reduced motion (`reduce`).
 */
function glideOffset(
	prev: Painted,
	next: Painted,
	el: HTMLElement,
	reduce: boolean,
): DashboardOffset | null {
	if (reduce) return null

	return next.at === null
		? glideFrom(prev, next.cell, next.snap, el)
		: stackGlideFrom(prev, next.cell, next.at)
}

/** The glide that runs on a tile, else `null`. */
type Running = RefObject<AnimationPlaybackControls | null>

/**
 * Ends the glide that runs on the tile. The cancel commits no frame of the glide,
 * so the transform of a carry that started in the same commit stays.
 */
function endGlide(el: HTMLElement, running: Running): void {
	running.current?.cancel()

	running.current = null

	delete el.dataset.gliding
}

/** Plays one glide from `offset` to rest, from the painted position of any glide that runs. */
function glide(el: HTMLElement, offset: DashboardOffset, running: Running): void {
	const painted = paintedOffset(el)

	endGlide(el, running)

	el.dataset.gliding = ''

	// The tile rests at `transform: none`. A transform of zero still makes the tile
	// a containing block and a stacking context.
	const controls = animate(
		el,
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
		if (running.current === controls) endGlide(el, running)
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
 * does each change under reduced motion. In the re-pack, a move of a gesture
 * glides from the layout box that the tile measures at its last commit. A new glide starts from the painted
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
	{ cell, carried, snap, stacked }: DashboardFlipOptions,
): void {
	const prevRef = useRef<Painted | null>(null)

	const running = useRef<AnimationPlaybackControls | null>(null)

	const reduceMotion = usePrefersReducedMotion()

	useLayoutEffect(() => {
		const el = ref.current

		const prev = prevRef.current

		const next = cell === undefined ? null : { cell, carried, snap, at: layoutAt(el, stacked) }

		if (next !== null) prevRef.current = next

		if (el === null || prev === null || next === null) return

		// A carried tile follows the pointer, and it glides only once the pointer lets
		// go. A glide overrides the transform of the carry, so a pickup ends it.
		if (carried !== null) {
			if (prev.carried === null) endGlide(el, running)

			return
		}

		const offset = glideOffset(prev, next, el, reduceMotion)

		if (offset !== null) glide(el, offset, running)
	}, [ref, cell, carried, snap, stacked, reduceMotion])
}
