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
	/** Moves the hover, or clears it with `null`s. */
	set: (index: number | null, point: ChartPoint | null) => void
}

export const [ChartHoverContext, useChartHover] = createContext<ChartHover>('ChartHover')
