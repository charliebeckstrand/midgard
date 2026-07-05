'use client'

import { type FocusEvent, type KeyboardEvent, useState } from 'react'
import type { ChartOrientation } from './chart-orientation'
import { project, type Vec } from './chart-orientation'
import type { ChartHover } from './context'

/**
 * The band centers and per-category value points a chart hands its frame for
 * keyboard navigation — the same targets the crosshair and tooltip snap to, so
 * an arrow-driven cursor lands exactly where the pointer would. `valuePoints`
 * is per category, one entry per visible series with a finite value; two series
 * sharing a value keep two coincident entries, never one, so the cursor visits
 * each of them.
 *
 * @internal
 */
export type ChartFocusTargets = {
	/** Each category's band-axis center. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — finite only, series order. */
	valuePoints: number[][]
}

/**
 * The keyboard focus cursor: a category crossed with one of its value points.
 * `value` indexes {@link ChartFocusTargets.valuePoints} at `category`, so
 * cycling it walks the visible series at that category — coincident points
 * included.
 *
 * @internal
 */
export type ChartCursor = {
	category: number
	value: number
}

/** The number of value points at a category, `0` when it has none. @internal */
function pointCount(targets: ChartFocusTargets, category: number): number {
	return targets.valuePoints[category]?.length ?? 0
}

/** Whether any category carries a value point — the gate for enabling navigation. @internal */
export function hasFocusTargets(targets: ChartFocusTargets): boolean {
	return targets.valuePoints.some((points) => points.length > 0)
}

/** The first (`-1`) or last (`+1`) category that carries a value point, or `-1` when none do. @internal */
function edgeCategory(targets: ChartFocusTargets, dir: 1 | -1): number {
	const n = targets.bandPositions.length

	if (dir < 0) {
		for (let i = 0; i < n; i++) if (pointCount(targets, i) > 0) return i
	} else {
		for (let i = n - 1; i >= 0; i--) if (pointCount(targets, i) > 0) return i
	}

	return -1
}

/** The cursor on the first focusable category, or `null` when nothing is focusable. @internal */
export function firstCursor(targets: ChartFocusTargets): ChartCursor | null {
	const category = edgeCategory(targets, -1)

	return category === -1 ? null : { category, value: 0 }
}

/**
 * The next focusable category from `from` stepping `dir`, clamped at the ends
 * (no wrap) and skipping empty categories so a gap never strands the cursor.
 *
 * @internal
 */
function stepCategory(targets: ChartFocusTargets, from: number, dir: 1 | -1): number {
	for (let i = from + dir; i >= 0 && i < targets.bandPositions.length; i += dir) {
		if (pointCount(targets, i) > 0) return i
	}

	return from
}

/**
 * Snaps a cursor into range against the current targets: a category with no
 * points falls to the first focusable one, and the value index clamps to that
 * category's count. Returns `null` when nothing is focusable.
 *
 * @internal
 */
export function clampCursor(
	cursor: ChartCursor | null,
	targets: ChartFocusTargets,
): ChartCursor | null {
	if (!cursor) return null

	const n = targets.bandPositions.length

	if (n === 0) return null

	const bounded = Math.max(0, Math.min(cursor.category, n - 1))

	const category = pointCount(targets, bounded) > 0 ? bounded : edgeCategory(targets, -1)

	if (category === -1) return null

	return { category, value: Math.max(0, Math.min(cursor.value, pointCount(targets, category) - 1)) }
}

/** The frame point a cursor anchors to, or `null` when it falls off the targets. @internal */
export function cursorPoint(
	cursor: ChartCursor,
	targets: ChartFocusTargets,
	orientation: ChartOrientation,
): Vec | null {
	const band = targets.bandPositions[cursor.category]

	const value = targets.valuePoints[cursor.category]?.[cursor.value]

	if (band === undefined || value === undefined) return null

	return project(orientation, value, band)
}

/** What a key does under an orientation: step the category, cycle the value points, jump, or clear. @internal */
type CursorAction = 'category+' | 'category-' | 'value+' | 'value-' | 'first' | 'last' | 'clear'

/**
 * Reads a key against the orientation. The band axis arrows step categories and
 * the value axis arrows cycle the series' value points, so a horizontal chart —
 * categories down the side — transposes which pair does which. Home / End jump
 * to the ends, Escape clears; anything else is `null` and left to the browser.
 *
 * @internal
 */
function keyAction(key: string, orientation: ChartOrientation): CursorAction | null {
	if (key === 'Escape') return 'clear'

	if (key === 'Home') return 'first'

	if (key === 'End') return 'last'

	const vertical = orientation === 'vertical'

	switch (key) {
		case 'ArrowRight':
			return vertical ? 'category+' : 'value+'
		case 'ArrowLeft':
			return vertical ? 'category-' : 'value-'
		case 'ArrowDown':
			return vertical ? 'value+' : 'category+'
		case 'ArrowUp':
			return vertical ? 'value-' : 'category-'
		default:
			return null
	}
}

/** Whether a key is one of the four arrows — the keys that enter navigation at the first point. @internal */
function isArrowKey(key: string): boolean {
	return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight'
}

/** The outcome of a keypress: whether it was a navigation key, and where the cursor lands. @internal */
export type CursorMove = {
	/** True when the key drove navigation, so the caller suppresses the browser default. */
	handled: boolean
	/** The next cursor, or `null` to clear the focus. */
	cursor: ChartCursor | null
}

/** The value index one step `dir` from `value`, wrapping across the category's points. @internal */
function cycleValue(value: number, count: number, dir: 1 | -1): number {
	return (value + dir + count) % count
}

/**
 * Resolves a keypress to the next cursor. The band axis arrows move to the
 * neighbouring category, keeping the value lane where it exists; the value axis
 * arrows cycle through the current category's value points — visiting every
 * visible series, coincident values included — so a chart whose series overlap
 * still steps through each of them. Unhandled keys pass through untouched.
 *
 * @internal
 */
export function moveCursor(
	cursor: ChartCursor | null,
	key: string,
	targets: ChartFocusTargets,
	orientation: ChartOrientation,
): CursorMove {
	const action = keyAction(key, orientation)

	if (action === null) return { handled: false, cursor }

	if (action === 'clear') return { handled: true, cursor: null }

	const base = clampCursor(cursor, targets) ?? firstCursor(targets)

	if (!base) return { handled: true, cursor: null }

	// Carry the value lane onto the destination category, clamped to its count so
	// a shorter category never strands the cursor past its last point.
	const onCategory = (category: number): CursorMove => ({
		handled: true,
		cursor: { category, value: Math.min(base.value, pointCount(targets, category) - 1) },
	})

	switch (action) {
		case 'category+':
			return onCategory(stepCategory(targets, base.category, 1))
		case 'category-':
			return onCategory(stepCategory(targets, base.category, -1))
		case 'first':
			return onCategory(edgeCategory(targets, -1))
		case 'last':
			return onCategory(edgeCategory(targets, 1))
		case 'value+':
			return {
				handled: true,
				cursor: {
					category: base.category,
					value: cycleValue(base.value, pointCount(targets, base.category), 1),
				},
			}
		case 'value-':
			return {
				handled: true,
				cursor: {
					category: base.category,
					value: cycleValue(base.value, pointCount(targets, base.category), -1),
				},
			}
	}
}

/** The handlers {@link useChartKeyboard} spreads onto the plot region to make it a navigable tab stop. @internal */
export type ChartKeyboardProps = {
	tabIndex: 0
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	onBlur: (event: FocusEvent<HTMLElement>) => void
}

/**
 * Makes the plot region a single arrow-navigable tab stop that drives the
 * shared hover context, so the crosshair and tooltip answer the keyboard the
 * way they answer the pointer. Focus alone only rings the region — a click
 * focuses it too, and stealing the readout from the pointer would jar — so the
 * first arrow reads the first data point; from there the band axis arrows walk
 * categories, the value axis arrows cycle the series' value points at a category
 * (visiting each series, coincident values included), Home / End jump to the
 * ends, and Escape drops focus. Leaving after navigating clears the readout; a
 * pointer-only focus leaves the pointer's readout alone. Returns `null` — no tab
 * stop — when navigation is off or the chart carries no value point, leaving the
 * region the plain `role="img"` it was.
 *
 * @param targets - The band centers and value points to navigate, or `undefined` on a chart that opts out (pie / donut).
 * @param orientation - Which screen axis the value runs along, so the arrows map to the right axes.
 * @param enabled - Whether a readout is mounted to answer the cursor — the tooltip that makes navigation legible.
 * @param set - The hover context's setter, moved to the cursor's anchor on each step.
 * @internal
 */
export function useChartKeyboard(
	targets: ChartFocusTargets | undefined,
	orientation: ChartOrientation,
	enabled: boolean,
	set: ChartHover['set'],
): ChartKeyboardProps | null {
	const [cursor, setCursor] = useState<ChartCursor | null>(null)

	const active = enabled && targets !== undefined && hasFocusTargets(targets)

	// Move the cursor and carry the hover to its anchor, or clear both.
	const show = (next: ChartCursor | null) => {
		setCursor(next)

		const point = next && targets ? cursorPoint(next, targets, orientation) : null

		if (next && point) set(next.category, point, true)
		else set(null, null)
	}

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (!targets) return

		const move = moveCursor(cursor, event.key, targets, orientation)

		if (!move.handled) return

		event.preventDefault()

		// Escape clears the readout and drops focus, the same exit the legend gives.
		if (move.cursor === null) {
			show(null)

			event.currentTarget.blur()

			return
		}

		// The first arrow enters at the first point rather than stepping past it;
		// Home / End are absolute jumps and place directly.
		if (cursor === null && isArrowKey(event.key)) {
			show(firstCursor(targets))

			return
		}

		show(move.cursor)
	}

	// Leaving the region after navigating clears the cursor and its readout; a
	// focus that never navigated (a click, with the pointer owning the readout)
	// leaves that readout untouched. A blur that stays inside the region — nothing
	// focusable does today — is not a real exit.
	const onBlur = (event: FocusEvent<HTMLElement>) => {
		if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return

		if (cursor !== null) show(null)
	}

	return active ? { tabIndex: 0, onKeyDown, onBlur } : null
}
