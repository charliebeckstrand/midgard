/**
 * Pure layout for the pie/donut callout cards — the leaderless Panel-surface
 * labels the pie shrinks to make room for. Given the measured card boxes it
 * solves the shrunk radius, splits the cards left / right of the center,
 * declumps each column against its real heights, and returns each card's
 * flush-edge side and top. React-free like {@link pieSlices}, so the geometry
 * is unit-testable in isolation.
 */

import {
	CALLOUT_FLOOR_MIN,
	CALLOUT_FLOOR_RATIO,
	CALLOUT_HYSTERESIS,
	CARD_GAP,
	CARD_MAX_WIDTH,
	LABEL_VGAP,
	MARK_GAP,
} from '../chart-constants'
import { at } from './pie-chart-geometry'

/** One sector the solver names: its source index, mid-angle, and share. @internal */
export type CalloutSlice = {
	/** The datum's index in the source data — text and colour key off it. */
	index: number
	/** The slice's mid-angle in degrees, clockwise from the top. */
	mid: number
	/** The slice's part of the whole, `0..1` — the drop order in forced mode. */
	share: number
}

/** A measured callout-card box, in px. @internal */
export type CardSize = { width: number; height: number }

/** Which side of the pie a card flushes to: `1` the right edge, `-1` the left. @internal */
export type CalloutSide = 1 | -1

/** The label mode a solve resolves to: named cards, or fit-gated segment labels. @internal */
export type CalloutMode = 'callout' | 'sector'

/** One placed card: the side it flushes to and its top, in frame coordinates. @internal */
export type PlacedCallout = {
	index: number
	side: CalloutSide
	/** The card's top edge in frame px, after declumping. */
	top: number
}

/** Input for {@link solveCallouts}. @internal */
export type CalloutInput = {
	/** The plot frame in px; frame coordinates equal the overlay's CSS px one-to-one. */
	frame: { width: number; height: number }
	/** The pie center in frame coordinates. */
	center: { x: number; y: number }
	slices: CalloutSlice[]
	/** Measured card boxes keyed by slice index; a missing entry measures zero. */
	sizes: Map<number, CardSize>
	/** The unshrunk radius the pie would draw at with no cards. */
	r0: number
	/**
	 * Callouts forced on (not auto): the solve keeps `callout` mode however it
	 * fits, flooring the radius and dropping smallest-share-first on overflow
	 * rather than switching to segment labels.
	 */
	forced: boolean
	/** The prior resolved mode, driving the auto hysteresis; omit on the first solve. */
	prevMode?: CalloutMode
}

/** The solved callout layout. @internal */
export type CalloutSolution = {
	mode: CalloutMode
	/** The radius the pie draws at: the shrunk radius under `callout`, `r0` under `sector`. */
	radius: number
	/** The placed cards; empty under `sector`. */
	placed: PlacedCallout[]
	/** Indices dropped in forced mode, smallest share first; empty otherwise. */
	dropped: number[]
}

/** A slice paired with its side and measured box. @internal */
type SizedSlice = CalloutSlice & { side: CalloutSide; size: CardSize }

/**
 * The floor the callout-shrunk radius never drops below: the larger of the
 * absolute minimum and a share of the unshrunk radius, so a small pie keeps a
 * usable disc and a large one never collapses past a fraction of itself.
 *
 * @internal
 */
export function calloutFloor(r0: number): number {
	return Math.max(CALLOUT_FLOOR_MIN, CALLOUT_FLOOR_RATIO * r0)
}

/**
 * The width every card measures and renders at: the card ceiling, capped by
 * the room a floor-radius pie leaves beside it, so measurement already reflects
 * the wrap the final layout allows. Independent of the solved radius — it turns
 * only on the frame width and `r0` — so it is stable to measure against before
 * the solve runs.
 *
 * @internal
 */
export function calloutMaxWidth(frameWidth: number, r0: number): number {
	return Math.max(0, Math.min(CARD_MAX_WIDTH, frameWidth / 2 - calloutFloor(r0) - CARD_GAP))
}

/** The side a sector's card sits on: right when its mid-angle radial exits at or past the vertical. @internal */
export function sideOf(mid: number): CalloutSide {
	return Math.sin((mid * Math.PI) / 180) >= 0 ? 1 : -1
}

/** A column's stacked height: the card heights plus the gaps between them. @internal */
function columnHeight(heights: number[]): number {
	if (heights.length === 0) return 0

	return heights.reduce((sum, height) => sum + height, 0) + (heights.length - 1) * LABEL_VGAP
}

/**
 * Stacks one side's cards down their column: each starts centered on its
 * sector's radial exit, then slides down to clear its predecessor by
 * `LABEL_VGAP`; the whole run then slides back inside `[0, H]`. Ideal-center
 * order is angular order per side, so no card ever leapfrogs a neighbour.
 * Returns the resolved tops keyed by slice index.
 *
 * @internal
 */
function stackColumn(
	cards: { index: number; center: number; height: number }[],
	frameHeight: number,
): Map<number, number> {
	const order = [...cards].sort((a, b) => a.center - b.center)

	const tops = new Map<number, number>()

	let cursor = Number.NEGATIVE_INFINITY

	for (const card of order) {
		const top = Math.max(card.center - card.height / 2, cursor)

		tops.set(card.index, top)

		cursor = top + card.height + LABEL_VGAP
	}

	const last = order[order.length - 1]

	const overflow = last ? (tops.get(last.index) ?? 0) + last.height - frameHeight : 0

	if (overflow > 0)
		for (const card of order) tops.set(card.index, (tops.get(card.index) ?? 0) - overflow)

	const first = order[0]

	const underflow = first ? (tops.get(first.index) ?? 0) : 0

	if (underflow < 0)
		for (const card of order) tops.set(card.index, (tops.get(card.index) ?? 0) - underflow)

	return tops
}

/** Places a kept card set at a fixed radius, and whether both columns fit the frame height. @internal */
function place(
	kept: SizedSlice[],
	radius: number,
	center: { x: number; y: number },
	frameHeight: number,
): { placed: PlacedCallout[]; fits: boolean } {
	const placed: PlacedCallout[] = []

	let fits = true

	for (const side of [1, -1] as const) {
		const column = kept.filter((slice) => slice.side === side)

		if (column.length === 0) continue

		const cards = column.map((slice) => ({
			index: slice.index,
			center: at(center.x, center.y, radius, slice.mid).y,
			height: slice.size.height,
		}))

		const tops = stackColumn(cards, frameHeight)

		for (const card of cards)
			placed.push({ index: card.index, side, top: tops.get(card.index) ?? 0 })

		if (columnHeight(column.map((slice) => slice.size.height)) > frameHeight) fits = false
	}

	return { placed, fits }
}

/**
 * Solves the callout layout: the shrunk radius, the mode verdict, and each
 * card's flush side and declumped top.
 *
 * Auto (`forced` off) shrinks the pie to `min(W/2 − gutter − CARD_GAP,
 * H/2 − vPad)` and takes the cards when that radius clears the floor and both
 * columns fit the height; otherwise it falls back to segment labels at `r0` —
 * a chart-level switch, never a half-callout pie. Hysteresis widens the
 * rise-to-callout threshold past the drop-to-sector one so a resize near the
 * floor cannot flap. Forced keeps the cards however they fit, flooring the
 * radius and dropping the smallest shares until each column fits — omitted,
 * never clipped.
 *
 * @internal
 */
export function solveCallouts(input: CalloutInput): CalloutSolution {
	const { frame, center, slices, sizes, r0, forced, prevMode } = input

	const sized: SizedSlice[] = slices.map((slice) => ({
		...slice,
		side: sideOf(slice.mid),
		size: sizes.get(slice.index) ?? { width: 0, height: 0 },
	}))

	const gutter = (side: CalloutSide): number => {
		const widths = sized.filter((slice) => slice.side === side).map((slice) => slice.size.width)

		return widths.length === 0 ? 0 : Math.min(CARD_MAX_WIDTH, Math.max(...widths))
	}

	// The pie is width-bound by the wider gutter and height-bound by the frame,
	// with a little vertical air so a near-square frame doesn't kiss the edge.
	const vPad = MARK_GAP * 2

	const wanted = Math.min(
		frame.width / 2 - Math.max(gutter(1), gutter(-1)) - CARD_GAP,
		frame.height / 2 - vPad,
	)

	const floor = calloutFloor(r0)

	if (!forced) {
		// Rise to callouts only past floor + hysteresis; drop back at the bare
		// floor — the gap keeps a resize near the threshold from flapping.
		const threshold = prevMode === 'callout' ? floor : floor + CALLOUT_HYSTERESIS

		const { placed, fits } = place(sized, wanted, center, frame.height)

		if (wanted >= threshold && fits) return { mode: 'callout', radius: wanted, placed, dropped: [] }

		return { mode: 'sector', radius: r0, placed: [], dropped: [] }
	}

	const radius = Math.max(wanted, floor)

	// Forced: drop the smallest share on whichever column still overruns the
	// height, smallest-first, until both fit or nothing is left.
	let kept = [...sized]

	const dropped: number[] = []

	for (;;) {
		const overrun = ([1, -1] as const).find(
			(side) =>
				columnHeight(
					kept.filter((slice) => slice.side === side).map((slice) => slice.size.height),
				) > frame.height,
		)

		if (overrun === undefined) break

		const column = kept.filter((slice) => slice.side === overrun)

		const victim = column.reduce(
			(min, slice) => (slice.share < min.share ? slice : min),
			column[0] as SizedSlice,
		)

		dropped.push(victim.index)

		kept = kept.filter((slice) => slice.index !== victim.index)

		if (kept.length === 0) break
	}

	const { placed } = place(kept, radius, center, frame.height)

	return { mode: 'callout', radius, placed, dropped }
}
