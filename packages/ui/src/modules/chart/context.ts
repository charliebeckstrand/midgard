'use client'

import { createContext } from '../../core'

/**
 * Hover state shared between a chart's hit layer and the frame's overlays:
 * the pointed category (or slice) index, `null` at rest. Confined to its own
 * context so pointer movement re-renders only the crosshair and tooltip —
 * never the marks subtree.
 *
 * @internal
 */
export type ChartHover = {
	/** The hovered category index, or `null` when the pointer is away. */
	index: number | null
	/** Moves the hover to a category index, or clears it with `null`. */
	setIndex: (index: number | null) => void
}

export const [ChartHoverContext, useChartHover] = createContext<ChartHover>('ChartHover')
