'use client'

import { type KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from 'react'
import { type PlotTabStopProps, usePlotTabStop } from '../../../hooks/use-plot-tab-stop'
import { useStableValue } from '../../../hooks/use-stable-value'
import { clamp } from '../../../utilities'
import { type ChartOrientation, project, type Vec, valueCoord } from './chart-orientation'
import { type ChartHoverStore, samePoint } from './context'

/**
 * The per-category anchor points a chart hands its frame for keyboard
 * navigation. They are already projected to frame coordinates, so the cursor
 * lands exactly where the pointer would. `points` is indexed by category — a
 * cartesian band, a pie's slice. Each entry lists that category's navigable
 * stops: one per visible series for a cartesian chart, a single centroid for a
 * pie slice. Two series sharing a value keep two coincident stops, never one, so
 * the cursor visits each of them.
 *
 * `references` carries the reference lines: their value-axis screen positions,
 * band-independent because a rule spans every category. They intersperse into
 * the value-axis roving in screen order. Each is a stop the cursor visits
 * alongside the series' points, receding the marks to the rule the way pointing
 * it does. They also index-align with the drawn rules, so an active one can be
 * named. A `null` slot holds a rule's place without a stop, keeping the finite
 * rules at the indices they draw at.
 *
 * `series` names the series behind each of `points`' stops, in the same order.
 * The cursor's value lane therefore resolves to the series it sits on, the one
 * it emphasizes while the rest recede. A band step also reads it to find the
 * lane of the cursor's series. A scatter names the series of each point in a
 * column, and a pie names each slice. Omitted, the chart reads no active
 * series, and leaves the emphasis alone.
 *
 * `indices` names the hover index that each of `points`' stops writes, in the
 * same order. Omitted, a stop writes its category. The heatmap makes each
 * column a category and each row a stop, and each stop writes its cell. The
 * band arrows then walk the columns, the value arrows walk the rows, and the
 * tooltip reads one cell.
 *
 * @internal
 */
export type ChartFocusTargets = {
	points: Vec[][]
	references?: (number | null)[]
	series?: number[][]
	indices?: number[][]
}

/**
 * The keyboard focus cursor: a category crossed with one of its stops. `value`
 * indexes the series stops at `category`, so stepping it walks that category's
 * series — coincident points included. `reference`, when set, parks the cursor
 * on that reference line at `category`'s band instead. `value` rides along as
 * the series lane to return to, when the value axis steps back off the rule.
 *
 * `series` names the series of the stop the cursor last landed on, on a chart
 * with a series map. A gap drops a stop, so one lane can name another series in
 * the next category. A band step therefore finds the lane of this series, and
 * falls back to `value` only where the series has no stop. The field stays
 * across that gap, so the cursor returns to its series after it.
 *
 * @internal
 */
export type ChartCursor = {
	category: number
	value: number
	reference?: number
	series?: number
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
	const carries = (stops: Vec[]) => stops.length > 0

	return dir < 0 ? targets.points.findIndex(carries) : targets.points.findLastIndex(carries)
}

/**
 * A cursor on the series stop `value` at `category`. It names the series behind
 * that stop, where the chart maps one. @internal
 */
function stopCursor(targets: ChartFocusTargets, category: number, value: number): ChartCursor {
	const series = targets.series?.[category]?.[value]

	return series === undefined ? { category, value } : { category, value, series }
}

/**
 * The value lane a cursor takes at `category`. That is the stop of the cursor's
 * series where the series has one there. Else it is the cursor's own lane,
 * clamped to the stop count. A gap in an earlier series therefore never moves
 * the cursor onto another series. @internal
 */
function laneAt(targets: ChartFocusTargets, category: number, cursor: ChartCursor): number {
	const own =
		cursor.series === undefined ? -1 : (targets.series?.[category]?.indexOf(cursor.series) ?? -1)

	return own === -1 ? clamp(cursor.value, 0, pointCount(targets, category) - 1) : own
}

/** The cursor on the first focusable category, or `null` when nothing is focusable. @internal */
export function firstCursor(targets: ChartFocusTargets): ChartCursor | null {
	const category = edgeCategory(targets, -1)

	return category === -1 ? null : stopCursor(targets, category, 0)
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

/**
 * What a cursor step lands on: the reference line it parks on, or the hover
 * index and the series that it writes. @internal
 */
type ChartCursorRead = { reference: number } | { index: number; series: number | null }

/** The reference line a cursor parks on, or `null` off any live rule. @internal */
function cursorRule(
	cursor: ChartCursor | null,
	targets: ChartFocusTargets | undefined,
): number | null {
	const reference = cursor?.reference

	if (reference === undefined || targets?.references?.[reference] == null) return null

	return reference
}

/** Whether a reference index names a live (finite) reference stop. @internal */
function isReferenceStop(targets: ChartFocusTargets, reference: number | undefined): boolean {
	return reference !== undefined && targets.references?.[reference] != null
}

/**
 * Snaps a cursor into range against the current targets. A category with no
 * stops falls to the first focusable one. The value index goes to the stop of
 * the cursor's series, else it clamps to that category's count. A `reference`
 * that no longer names a live rule drops, leaving the cursor on its series lane.
 * Returns `null` when nothing is focusable.
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

	const bounded = clamp(cursor.category, 0, n - 1)

	const category = pointCount(targets, bounded) > 0 ? bounded : edgeCategory(targets, -1)

	if (category === -1) return null

	const { reference, ...lane } = cursor

	const live = { ...lane, category, value: laneAt(targets, category, cursor) }

	return isReferenceStop(targets, reference) ? { ...live, reference } : live
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
 * The hover index that a cursor writes: the index of its stop where the targets
 * map one, else its category. @internal
 */
function cursorIndex(cursor: ChartCursor, targets: ChartFocusTargets): number {
	return targets.indices?.[cursor.category]?.[cursor.value] ?? cursor.category
}

/**
 * The series index the cursor sits on, or `null`. A cursor parked on a reference
 * line names no series. A chart that maps no series to its stops — or a stop
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
 * Reads a key against the orientation. The band axis arrows step categories, and
 * the value axis arrows cycle the series' value points. A horizontal chart —
 * categories down the side — therefore transposes which pair does which. Home /
 * End jump to the ends, Escape clears; anything else is `null` and left to the browser.
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
 * every reference line. They are sorted by their value-axis position, so an
 * arrow steps through them the way it points. That is down a vertical chart, and
 * right a horizontal one. Coincident stops tie-break to a stable order, series
 * before a rule sharing the value, so overlapping stops stay distinct and reachable.
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
 * The cursor one step `dir` along the value axis. It walks the category's
 * stops — series points and reference lines alike — in screen order, rather than
 * the order they arrive in. Landing on a reference line parks the cursor there
 * while keeping its series lane. Landing on a series point clears the parking,
 * and names the series of that point. The step wraps at the ends.
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
		? { ...cursor, reference: next.index }
		: stopCursor(targets, cursor.category, next.index)
}

/**
 * Resolves a keypress to the next cursor. The band axis arrows move to the
 * neighboring category. They keep the series the cursor sits on, else the value
 * lane where it exists. They slide a parked reference line along to the new
 * band. The value axis arrows step through the current category's stops in
 * screen order. That is every visible series, coincident values included, with
 * the reference lines interspersed among them. A rule therefore roves alongside
 * the data, and receding the marks reads as one gesture. Unhandled keys pass
 * through untouched.
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

	// Carry the cursor onto the destination category. It keeps the lane of its
	// series there, else its value lane clamped to the count, so a shorter
	// category never strands it past its last point. A parked reference line
	// rides along, since a rule spans every band.
	const onCategory = (category: number): CursorMove => ({
		handled: true,
		cursor: { ...base, category, value: laneAt(targets, category, base) },
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

/**
 * A parked cursor resolved against the current targets: its clamped stop, its
 * frame point, and its series. A cursor on a reference line has no point and no
 * series. @internal
 */
type ResolvedStop = { live: ChartCursor; anchor: Vec | null; series: number | null }

/** Whether two resolved stops sit on one point or rule, in one category, on one series. @internal */
function sameStop(previous: ResolvedStop | null, next: ResolvedStop | null): boolean {
	if (previous === null || next === null) return previous === next

	return (
		samePoint(previous.anchor, next.anchor) &&
		previous.live.category === next.live.category &&
		previous.live.reference === next.live.reference &&
		previous.series === next.series
	)
}

/** Whether two cursors hold one category, lane, rule, and series. @internal */
function sameCursor(a: ChartCursor | null, b: ChartCursor | null): boolean {
	if (a === null || b === null) return a === b

	return (
		a.category === b.category &&
		a.value === b.value &&
		a.reference === b.reference &&
		a.series === b.series
	)
}

/**
 * Makes the plot region a single arrow-navigable tab stop that drives the
 * shared hover context. The crosshair and tooltip therefore answer the keyboard
 * the way they answer the pointer.
 *
 * Focus alone only rings the region. A click focuses it too, and stealing the
 * readout from the pointer would jar, so the first arrow reads the first data
 * point. From there:
 *
 * - The band axis arrows walk categories.
 * - The value axis arrows step the series' value points at a category in screen
 *   order, visiting each series, coincident values included.
 * - Home / End jump to the ends.
 * - Escape drops focus. It claims the press only when it clears a readout. A
 *   dialog around the chart therefore closes on an Escape with nothing to clear,
 *   and on the second Escape after a readout.
 *
 * Reference lines join the value-axis roving as their own stops. Landing on one
 * recedes the marks to it, the same emphasis pointing it applies. It also drops
 * the series readout, so the rule reads against a quieted field. Stepping off
 * restores it.
 *
 * Landing on a series point emphasizes that series the way hovering its legend
 * entry does. The other series recede to a quarter opacity, and the tooltip dims
 * their rows. The dataset the cursor reads therefore stands alone. Stepping to
 * another series moves the emphasis with it, and leaving or reaching a rule
 * clears it.
 *
 * Leaving after navigating clears the readout; a pointer-only focus leaves the
 * pointer's readout alone. Escape drops focus to the body, then re-arms the
 * region as the next Tab's destination. Tabbing back in therefore returns to the
 * chart the reader just left, rather than stepping to the following stop.
 * Returns `null` — no tab stop — when navigation is off or the chart carries no
 * value point, leaving the region the plain `role="img"` it was.
 *
 * @param targets - The per-category anchor points and reference stops to navigate, or `undefined` on a chart with none.
 * @param orientation - Which screen axis the value runs along, so the arrows map to the right axes and steps sort in screen order.
 * @param enabled - Whether a readout is mounted to answer the cursor — the tooltip that makes navigation legible.
 * @param store - The hover store. Each step moves its hover to the cursor's
 * anchor, and Escape reads it for a readout to clear.
 * @param setReference - The emphasis setter, moved to the reference line the cursor parks on, or `null` off it.
 * @param setActiveSeries - The series-emphasis setter, moved to the series the
 * cursor sits on. It is `null` off any series: a reference, a cleared cursor, or
 * a chart with no series map.
 * @param onRead - Called when a key moves the cursor onto a data point, with the
 * hover index and the series that the cursor writes. The frame announces the
 * readout of that point through it. A re-anchor, a pointer move, and a stop on a
 * reference line do not call it.
 * @param onReadReference - Called when a key moves the cursor onto a reference
 * line from another stop, with the index of that line. The frame announces the
 * label and the value of the line through it. A band step along the same line, a
 * re-anchor, and a pointer move do not call it.
 * @internal
 */
export function useChartKeyboard(
	targets: ChartFocusTargets | undefined,
	orientation: ChartOrientation,
	enabled: boolean,
	store: ChartHoverStore,
	setReference: (reference: number | null) => void,
	setActiveSeries: (series: number | null) => void,
	onRead?: (index: number, series: number | null) => void,
	onReadReference?: (reference: number) => void,
): PlotTabStopProps | null {
	const [cursor, setCursor] = useState<ChartCursor | null>(null)

	// The frame point the keyboard last wrote to the hover, or `null` for a clear.
	// A hover that holds another point belongs to the pointer. Only the handlers
	// and the effects read and write it.
	const written = useRef<Vec | null>(null)

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
				store.set(null, null)

				setCursor(null)
			}
		}
	}, [active, cursor, store, setReference, setActiveSeries])

	// A resize or a data change moves the stops under a parked cursor. Re-anchor
	// the cursor, so the crosshair and the tooltip do not stay on a stale point
	// until the next key. The cursor is clamped into the current targets first: a
	// data change can drop its category, its rule, or the stop of its series.
	const live = cursor !== null && targets ? clampCursor(cursor, targets) : null

	// The resolved stop, held while its point, category, rule, and series stay the
	// same: the targets are a new array on each render. A pointer move leaves it
	// unchanged, so the re-anchor does not run for one.
	const stop = useStableValue(
		live !== null && targets
			? { live, anchor: cursorPoint(live, targets), series: cursorSeries(live, targets) }
			: null,
		sameStop,
	)

	// Carries the cursor to `next`, with its emphasis and its readout. A reference
	// line the cursor parks on owns the emphasis, not the marks: recede the whole
	// field and drop the series readout so the rule reads alone. Anywhere else,
	// carry the readout to the cursor's anchor, and emphasize the series it sits
	// on so the rest recede. A `null` cursor clears all of them. Returns the rule
	// the cursor parks on, or the hover index and the series that the cursor
	// writes, or `null` when it writes none.
	const applyCursor = (next: ChartCursor | null): ChartCursorRead | null => {
		if (!sameCursor(cursor, next)) setCursor(next)

		const rule = cursorRule(next, targets)

		const point = next !== null && targets && rule === null ? cursorPoint(next, targets) : null

		setReference(rule)

		const series = next !== null && targets && point ? cursorSeries(next, targets) : null

		setActiveSeries(series)

		written.current = point

		if (next !== null && targets && point) {
			const index = cursorIndex(next, targets)

			store.set(index, point, true)

			return { index, series }
		}

		store.set(null, null)

		return rule === null ? null : { reference: rule }
	}

	// Reads the cursor, the store, and `applyCursor` when it runs. The re-anchor
	// moves the readout only while the store holds the point that the keyboard
	// wrote last. A pointer that took the readout since then keeps it.
	const reanchor = useEffectEvent((next: ChartCursor) => {
		if (cursor === null || !samePoint(store.get().point, written.current)) return

		applyCursor(next)
	})

	useEffect(() => {
		if (stop !== null) reanchor(stop.live)
	}, [stop])

	const { leave, onBlur } = usePlotTabStop(cursor !== null, () => applyCursor(null))

	// Reports what a key moved the cursor onto. A band step slides a parked rule
	// along with the cursor, and the rule reads the same at each band, so only the
	// step onto the rule reports it.
	const read = (landed: ChartCursorRead | null) => {
		if (landed === null) return

		if ('reference' in landed) {
			if (cursor?.reference !== landed.reference) onReadReference?.(landed.reference)

			return
		}

		onRead?.(landed.index, landed.series)
	}

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (!targets) return

		const move = moveCursor(cursor, event.key, targets, orientation)

		if (!move.handled) return

		// Escape clears the readout and drops focus, the same exit the legend gives,
		// then re-arms the region so the next Tab returns to it. It claims the press
		// only when it clears a live readout: the cursor's, or one that a click
		// pinned or the pointer holds. With nothing to clear, the press also reaches
		// an overlay around the chart, which closes as it does for the legend.
		if (move.cursor === null) {
			leave(event, store.get().index !== null)

			return
		}

		event.preventDefault()

		// The first arrow enters at the first point rather than stepping past it;
		// Home / End are absolute jumps and place directly.
		read(applyCursor(cursor === null && isArrowKey(event.key) ? firstCursor(targets) : move.cursor))
	}

	return active ? { tabIndex: 0, onKeyDown, onBlur } : null
}
