'use client'

import { createContext } from '../../core'

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
 * pointing a reference rule recedes the data marks to it — the same focus the
 * legend applies to a series. Its own context so a rule's hover re-renders only
 * the marks, never the frame.
 *
 * @internal
 */
export type ChartEmphasis = {
	/** Whether a reference rule is hovered, so the marks recede behind it. */
	referenceActive: boolean
	/** Sets the reference-hover emphasis; a rule turns it on while pointed. */
	setReferenceActive: (active: boolean) => void
}

export const [ChartEmphasisContext, useChartEmphasis] =
	createContext<ChartEmphasis>('ChartEmphasis')
