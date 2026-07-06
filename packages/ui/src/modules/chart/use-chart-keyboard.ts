'use client'

import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { type ChartOrientation, project, type Vec, valueCoord } from './chart-orientation'
import type { ChartHover } from './context'

/**
 * The per-category anchor points a chart hands its frame for keyboard
 * navigation, already projected to frame coordinates so the cursor lands exactly
 * where the pointer would. `points` is indexed by category — a cartesian band, a
 * pie's slice — and each entry lists that category's navigable stops: one per
 * visible series for a cartesian chart, a single centroid for a pie slice. Two
 * series sharing a value keep two coincident stops, never one, so the cursor
 * visits each of them.
 *
 * `references` carries the reference lines: their value-axis screen positions,
 * band-independent because a rule spans every category. They intersperse into
 * the value-axis roving in screen order — a stop the cursor visits alongside the
 * series' points, receding the marks to the rule the way pointing it does — and
 * index-align with the drawn rules so an active one can be named. A `null` slot
 * holds a rule's place without a stop, keeping the finite rules at the indices
 * they draw at.
 *
 * `series` names the series behind each of `points`' stops, in the same order,
 * so the cursor's value lane resolves to the series it sits on — the one it
 * emphasises while the rest recede. Omitted on a chart whose stops don't map to
 * a single series (a scatter column stacks several), which then reads no active
 * series and leaves the emphasis alone.
 *
 * @internal
 */
export type ChartFocusTargets = {
	points: Vec[][]
	references?: (number | null)[]
	series?: number[][]
}

/**
 * The keyboard focus cursor: a category crossed with one of its stops. `value`
 * indexes the series stops at `category`, so stepping it walks that category's
 * series — coincident points included. `reference`, when set, parks the cursor
 * on that reference line at `category`'s band instead; `value` rides along as the
 * series lane to return to when the value axis steps back off the rule.
 *
 * @internal
 */
export type ChartCursor = {
	category: number
	value: number
	reference?: number
}

/** The number of stops at a category, `0` when it has none. @internal */
function pointCount(targets: ChartFocusTargets, category: number): number {
	return targets.points[category]?.length ?? 0
}

/** Whether any category carries a stop — the gate for enabling navigation. @internal */
export function hasFocusTargets(targets: ChartFocusTargets): boolean {
	return targets.points.some((stops) => stops.length > 0)
}

/** The first (`-1`) or last (`+1`) category that carries a stop, or `-1` when none do. @internal */
function edgeCategory(targets: ChartFocusTargets, dir: 1 | -1): number {
	const n = targets.points.length

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
	for (let i = from + dir; i >= 0 && i < targets.points.length; i += dir) {
		if (pointCount(targets, i) > 0) return i
	}

	return from
}

/** Whether a reference index names a live (finite) reference stop. @internal */
function isReferenceStop(targets: ChartFocusTargets, reference: number | undefined): boolean {
	return reference !== undefined && targets.references?.[reference] != null
}

/**
 * Snaps a cursor into range against the current targets: a category with no
 * stops falls to the first focusable one, and the value index clamps to that
 * category's count. A `reference` that no longer names a live rule drops, leaving
 * the cursor on its series lane. Returns `null` when nothing is focusable.
 *
 * @internal
 */
export function clampCursor(
	cursor: ChartCursor | null,
	targets: ChartFocusTargets,
): ChartCursor | null {
	if (!cursor) return null

	const n = targets.points.length

	if (n === 0) return null

	const bounded = Math.max(0, Math.min(cursor.category, n - 1))

	const category = pointCount(targets, bounded) > 0 ? bounded : edgeCategory(targets, -1)

	if (category === -1) return null

	const value = Math.max(0, Math.min(cursor.value, pointCount(targets, category) - 1))

	return isReferenceStop(targets, cursor.reference)
		? { category, value, reference: cursor.reference }
		: { category, value }
}

/**
 * The frame point a cursor anchors to, or `null` when it falls off the targets.
 * A cursor parked on a reference line has no series anchor — the rule owns the
 * emphasis instead — so it reads `null`. @internal
 */
export function cursorPoint(cursor: ChartCursor, targets: ChartFocusTargets): Vec | null {
	if (cursor.reference !== undefined) return null

	return targets.points[cursor.category]?.[cursor.value] ?? null
}

/**
 * The series index the cursor sits on, or `null`. A cursor parked on a reference
 * line names no series, and a chart that maps no series to its stops — or a stop
 * past the map — reads `null` too, leaving the emphasis untouched. @internal
 */
export function cursorSeries(cursor: ChartCursor, targets: ChartFocusTargets): number | null {
	if (cursor.reference !== undefined) return null

	return targets.series?.[cursor.category]?.[cursor.value] ?? null
}

/**
 * Builds cartesian focus targets: each category's visible value positions
 * projected onto the frame through the orientation, so the stored anchors match
 * the marks. Values arrive in series order and stay that way — the cursor sorts
 * them into screen order only when it steps. `references` are the reference
 * lines' value-axis positions, kept band-independent and carried through
 * untouched so they rove alongside the series stops at every category.
 *
 * @internal
 */
export function cartesianFocus(
	bandPositions: number[],
	valuePoints: number[][],
	orientation: ChartOrientation,
	references?: (number | null)[],
	series?: number[][],
): ChartFocusTargets {
	return {
		points: valuePoints.map((values, index) => {
			const band = bandPositions[index]

			return band === undefined ? [] : values.map((value) => project(orientation, value, band))
		}),
		...(references && references.length > 0 ? { references } : {}),
		...(series && series.length > 0 ? { series } : {}),
	}
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

/**
 * A value-axis stop: a category's series point (`data`) or a reference line
 * (`ref`), each at its screen position along the value axis. `index` addresses
 * the kind's own list — a series lane or a `references` slot. @internal
 */
type Stop = { kind: 'data' | 'ref'; index: number; pos: number }

/**
 * A category's value-axis stops in screen order: its series points crossed with
 * every reference line, sorted by their value-axis position so an arrow steps
 * through them the way it points — down a vertical chart, right a horizontal one.
 * Coincident stops tie-break to a stable order, series before a rule sharing the
 * value, so overlapping stops stay distinct and reachable.
 *
 * @internal
 */
function orderedStops(
	targets: ChartFocusTargets,
	category: number,
	orientation: ChartOrientation,
): Stop[] {
	const data: Stop[] = (targets.points[category] ?? []).map((point, index) => ({
		kind: 'data',
		index,
		pos: valueCoord(orientation, point),
	}))

	const refs: Stop[] = (targets.references ?? []).flatMap((pos, index) =>
		pos == null ? [] : [{ kind: 'ref', index, pos }],
	)

	const tier = (stop: Stop) => (stop.kind === 'data' ? 0 : 1)

	return [...data, ...refs].sort((a, b) => a.pos - b.pos || tier(a) - tier(b) || a.index - b.index)
}

/**
 * The cursor one step `dir` along the value axis, walking the category's stops —
 * series points and reference lines alike — in screen order rather than the
 * order they arrive in. Landing on a reference line parks the cursor there while
 * keeping its series lane; landing on a series point clears the parking. The step
 * wraps at the ends.
 *
 * @internal
 */
function stepStop(
	targets: ChartFocusTargets,
	cursor: ChartCursor,
	dir: 1 | -1,
	orientation: ChartOrientation,
): ChartCursor {
	const stops = orderedStops(targets, cursor.category, orientation)

	if (stops.length === 0) return cursor

	const onReference = cursor.reference !== undefined

	const rank = stops.findIndex((stop) =>
		onReference
			? stop.kind === 'ref' && stop.index === cursor.reference
			: stop.kind === 'data' && stop.index === cursor.value,
	)

	const next = stops[(Math.max(rank, 0) + dir + stops.length) % stops.length]

	if (!next) return cursor

	return next.kind === 'ref'
		? { category: cursor.category, value: cursor.value, reference: next.index }
		: { category: cursor.category, value: next.index }
}

/**
 * Resolves a keypress to the next cursor. The band axis arrows move to the
 * neighbouring category, keeping the value lane where it exists and sliding a
 * parked reference line along to the new band; the value axis arrows step through
 * the current category's stops in screen order — every visible series, coincident
 * values included, and the reference lines interspersed among them — so a rule
 * roves alongside the data and receding the marks reads as one gesture. Unhandled
 * keys pass through untouched.
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
	// a shorter category never strands the cursor past its last point; a parked
	// reference line rides along, since a rule spans every band.
	const onCategory = (category: number): CursorMove => ({
		handled: true,
		cursor: {
			category,
			value: Math.min(base.value, pointCount(targets, category) - 1),
			...(base.reference !== undefined ? { reference: base.reference } : {}),
		},
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
			return { handled: true, cursor: stepStop(targets, base, 1, orientation) }
		case 'value-':
			return { handled: true, cursor: stepStop(targets, base, -1, orientation) }
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
 * categories, the value axis arrows step the series' value points at a category
 * in screen order (visiting each series, coincident values included), Home / End
 * jump to the ends, and Escape drops focus. Reference lines join the value-axis
 * roving as their own stops: landing on one recedes the marks to it — the same
 * emphasis pointing it applies — and drops the series readout, so the rule reads
 * against a quieted field; stepping off restores it. Landing on a series point
 * emphasises that series the way hovering its legend entry does — the other
 * series recede to a quarter opacity and the tooltip dims their rows — so the
 * dataset the cursor reads stands alone; stepping to another series moves the
 * emphasis with it, and leaving or reaching a rule clears it. Leaving after
 * navigating clears the readout; a
 * pointer-only focus leaves the pointer's readout alone. Escape drops focus to
 * the body, then re-arms the region as the next Tab's destination, so tabbing
 * back in returns to the chart the reader just left rather than stepping to the
 * following stop. Returns `null` — no tab
 * stop — when navigation is off or the chart carries no value point, leaving the
 * region the plain `role="img"` it was.
 *
 * @param targets - The per-category anchor points and reference stops to navigate, or `undefined` on a chart with none.
 * @param orientation - Which screen axis the value runs along, so the arrows map to the right axes and steps sort in screen order.
 * @param enabled - Whether a readout is mounted to answer the cursor — the tooltip that makes navigation legible.
 * @param set - The hover context's setter, moved to the cursor's anchor on each step.
 * @param setReference - The emphasis setter, moved to the reference line the cursor parks on, or `null` off it.
 * @param setActiveSeries - The series-emphasis setter, moved to the series the cursor sits on, or `null` off any (a reference, a cleared cursor, or a chart with no series map).
 * @internal
 */
export function useChartKeyboard(
	targets: ChartFocusTargets | undefined,
	orientation: ChartOrientation,
	enabled: boolean,
	set: ChartHover['set'],
	setReference: (reference: number | null) => void,
	setActiveSeries: (series: number | null) => void,
): ChartKeyboardProps | null {
	const [cursor, setCursor] = useState<ChartCursor | null>(null)

	// The pending "return the next Tab to the region" listener's remover, cleared
	// when it fires or the hook unmounts. Escape drops focus to the body, so a
	// document-level catch is the only way to reclaim the following Tab.
	const returnTab = useRef<(() => void) | null>(null)

	useEffect(() => () => returnTab.current?.(), [])

	const active = enabled && targets !== undefined && hasFocusTargets(targets)

	// Release what the cursor held once navigation switches off — the rules or
	// series removed, the tooltip unmounted — so no stale dim, crosshair, or
	// readout lingers with no way to clear it (a blur never fires). The cursor gate
	// keeps this from clearing a hover the pointer owns.
	useEffect(() => {
		if (!active) {
			setReference(null)

			setActiveSeries(null)

			if (cursor !== null) {
				set(null, null)

				setCursor(null)
			}
		}
	}, [active, cursor, set, setReference, setActiveSeries])

	// The shared hover holds the frame point the last keypress resolved to; a resize
	// (or a data change) shifts the band positions under a parked cursor, so
	// re-anchor it rather than leave the crosshair and tooltip on a stale point until
	// the next key. Keyed on the resolved point alone — a pointer move leaves the
	// cursor's anchor unchanged, so it never wrests the hover back from the pointer.
	const anchor = cursor !== null && targets ? cursorPoint(cursor, targets) : null

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-anchors when the resolved point moves; cursor/set are read fresh at fire time and targets is a new array each render
	useEffect(() => {
		if (cursor !== null && anchor !== null) set(cursor.category, anchor, true)
	}, [anchor?.x, anchor?.y])

	// A reference line the cursor parks on owns the emphasis, not the marks: recede
	// the whole field and drop the series readout so the rule reads alone — no one
	// series is active. Anywhere else, carry the hover to the cursor's anchor and
	// emphasise the series it sits on so the rest recede, or clear both.
	const show = (next: ChartCursor | null) => {
		setCursor(next)

		const reference = next?.reference

		if (reference !== undefined && targets?.references?.[reference] != null) {
			setReference(reference)

			setActiveSeries(null)

			set(null, null)

			return
		}

		setReference(null)

		const point = next && targets ? cursorPoint(next, targets) : null

		if (next && targets && point) {
			set(next.category, point, true)

			setActiveSeries(cursorSeries(next, targets))
		} else {
			set(null, null)

			setActiveSeries(null)
		}
	}

	// Escape leaves the region the way the legend does — focus off, readout
	// cleared — but arms the region as the next Tab's target: without it the blur
	// strands the chart, and the following Tab steps to the stop after it rather
	// than back onto the chart the reader was in. The catch reclaims only the
	// forward Tab, and only while the blur still holds the body — a click or a
	// Shift+Tab elsewhere means the reader has moved on, so it cedes the Tab.
	const dropFocus = (region: HTMLElement) => {
		const doc = region.ownerDocument

		returnTab.current?.()

		const onDocKeyDown = (keydown: globalThis.KeyboardEvent) => {
			returnTab.current?.()

			if (keydown.key !== 'Tab' || keydown.shiftKey || doc.activeElement !== doc.body) return

			keydown.preventDefault()

			region.focus()
		}

		doc.addEventListener('keydown', onDocKeyDown, true)

		returnTab.current = () => {
			doc.removeEventListener('keydown', onDocKeyDown, true)

			returnTab.current = null
		}

		region.blur()
	}

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (!targets) return

		const move = moveCursor(cursor, event.key, targets, orientation)

		if (!move.handled) return

		event.preventDefault()

		// Escape clears the readout and drops focus, the same exit the legend gives,
		// then re-arms the region so the next Tab returns to it.
		if (move.cursor === null) {
			show(null)

			dropFocus(event.currentTarget)

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
