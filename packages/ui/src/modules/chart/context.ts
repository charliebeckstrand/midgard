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
