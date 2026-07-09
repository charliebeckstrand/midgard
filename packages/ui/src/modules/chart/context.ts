'use client'

import { createContext } from '../../core'
import type { ChartTier } from './chart-tier'

/** The pointer's position in the frame's coordinate space. @internal */
export type ChartPoint = {
	x: number
	y: number
}

/**
 * Hover state shared between a chart's hit layer and the frame's overlays:
 * the pointed category (or slice) index for snapping, and the precise pointer
 * point the tooltip tracks. Confined to its own context so pointer movement
 * re-renders only the crosshair and tooltip — never the marks.
 *
 * @internal
 */
export type ChartHover = {
	/** The hovered category index, or `null` when the pointer is away. */
	index: number | null
	/** The pointer's exact frame coordinates while hovering, `null` at rest. */
	point: ChartPoint | null
	/** Whether the pointer sits on a data mark — the tooltip's gate; the crosshair ignores it. */
	onData: boolean
	/** Moves the hover, or clears it with `null`s; `onData` defaults to on-mark. */
	set: (index: number | null, point: ChartPoint | null, onData?: boolean) => void
}

export const [ChartHoverContext, useChartHover] = createContext<ChartHover>('ChartHover')

/**
 * A reference to one drawn mark: its series index (a slice's own index for the
 * pies), and the datum within that series — a bar's or point's position — or
 * `null` for the whole series, which is what a line, an area, and legend or
 * keyboard emphasis all point at.
 *
 * @internal
 */
export type ChartMarkRef = { series: number; datum: number | null }

/**
 * Whether `mark` lights the given series — and datum, when one is checked: a
 * whole-series emphasis (`datum: null`) lights every datum in its series, while
 * a datum emphasis lights only its own. A group-level query passes no `datum`
 * and reads the series alone. @internal
 */
function markLights(mark: ChartMarkRef, series: number, datum: number | null | undefined): boolean {
	if (mark.series !== series) return false

	return datum === undefined || mark.datum === null || mark.datum === datum
}

/**
 * The one mark emphasis every cartesian and point chart shares: the mark the
 * pointer sits on — a bar, a line, a disc — else the series the legend or
 * keyboard picks, receding all the others behind it. Its own context so the
 * marks re-render only when the emphasised mark changes — a discrete crossing —
 * never on the per-pixel pointer movement the hover context carries; the frame
 * holds the marks as children, so its own hover state never reaches them.
 *
 * The pointed mark wins over a still-held legend / keyboard one, the way the
 * reference emphasis resolves the pointer over the keyboard. A datum reference
 * (`datum` set) isolates one mark; a series reference (`datum: null`) — a line,
 * or the coarse legend emphasis — isolates the whole series.
 *
 * @internal
 */
export type ChartMarkEmphasis = {
	/** The emphasised mark — the pointer's, else the legend / keyboard series — or `null` when nothing is. */
	mark: ChartMarkRef | null
	/**
	 * Whether a mark reads at full strength: nothing emphasised, or this is the
	 * emphasised series (and datum, when one is checked). A renderer dims a mark
	 * where this returns `false`. Omit `datum` for a whole-series group.
	 */
	lit: (series: number, datum?: number | null) => boolean
	/** Sets the pointed mark (`null` clears); the hit layer writes it while the pointer sits on a mark. */
	setPointed: (mark: ChartMarkRef | null) => void
}

export const [ChartMarkEmphasisContext, useChartMarkEmphasis] = createContext<ChartMarkEmphasis>(
	'ChartMarkEmphasis',
	{ default: { mark: null, lit: () => true, setPointed: () => {} } },
)

/**
 * Resolves the shared {@link ChartMarkEmphasis}: the pointed mark takes the
 * emphasis, else the legend / keyboard series lifts to a whole-series reference,
 * else nothing is emphasised and every mark reads lit. The frame builds it from
 * its own pointer state and the emphasis its chart passes down.
 *
 * @internal
 */
export function chartMarkEmphasis(
	pointed: ChartMarkRef | null,
	legendSeries: number | null,
	setPointed: (mark: ChartMarkRef | null) => void,
): ChartMarkEmphasis {
	const mark = pointed ?? (legendSeries !== null ? { series: legendSeries, datum: null } : null)

	return {
		mark,
		lit: (series, datum) => mark === null || markLights(mark, series, datum),
		setPointed,
	}
}

/** Whether two mark references coincide, so a redundant pointed write can bail. @internal */
export function sameMark(a: ChartMarkRef | null, b: ChartMarkRef | null): boolean {
	return a === b || (a !== null && b !== null && a.series === b.series && a.datum === b.datum)
}

/**
 * Marks emphasis shared between a chart's reference layer and its marks:
 * pointing a reference rule — or roving the keyboard cursor onto it — recedes the
 * data marks to it and its sibling rules with them, the same focus the legend
 * applies to a series. Its own context so a rule's hover re-renders only the
 * marks and rules, never the frame.
 *
 * @internal
 */
export type ChartEmphasis = {
	/** Whether a reference rule is emphasised — pointed or keyboard-focused — so the data marks recede behind it. */
	referenceActive: boolean
	/** Sets the pointed reference's index (`null` clears); a rule or its legend chip sets it while pointed. */
	setReferenceActive: (index: number | null) => void
	/**
	 * The keyboard-focused reference line's index, or `null` — the rule the arrow
	 * cursor parks on, so it reads as chosen while the marks recede. Pointer hover
	 * leaves it `null`; the rule floats its own tooltip instead.
	 */
	activeReference: number | null
	/**
	 * The reference the emphasis rests on — pointed or keyboard-focused — so its
	 * sibling rules recede to it, the way the data marks do. Pointer wins over a
	 * still-held keyboard focus; `null` when nothing is emphasised.
	 */
	emphasizedReference: number | null
}

export const [ChartEmphasisContext, useChartEmphasis] =
	createContext<ChartEmphasis>('ChartEmphasis')

/**
 * Whether the chart is rendering inside the fullscreen dialog. The chart the
 * menu re-mounts there is a live, interactive copy — its frame reads this to
 * skip its own context menu, so the enlarged chart is a child of the menu, not
 * another menu host (which would recurse). Default `false` for a chart in the
 * page.
 *
 * @internal
 */
export const [ChartFullscreenContext, useChartFullscreen] = createContext<boolean>(
	'ChartFullscreen',
	{ default: false },
)

/**
 * The frame's resolved {@link ChartTier}, published so the interactive layers
 * stand themselves down at spark — the hit areas and crosshair unmount, the
 * value labels drop, and the reference rules shed their hover rendering —
 * instead of every chart gating each of them at its call site. One half of the
 * frame's spark posture; the other is the pointer veto `k.drawing` lays over
 * the drawing itself. Defaults to `'standard'`, so a layer rendered outside a
 * frame keeps its interactive behaviour.
 *
 * @internal
 */
export const [ChartTierContext, useChartTier] = createContext<ChartTier>('ChartTier', {
	default: 'standard',
})
