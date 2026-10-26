'use client'

import { type ReactNode, useMemo, useState, useSyncExternalStore } from 'react'
import { createContext } from '../../../core'
import { useChartHoverStore } from '../engine/context'

/** The class the range legend is probing, or `null` at rest: the cells outside it dim. @internal */
type HeatmapFocus = {
	/** The probed bin index, or `null` when the legend is at rest. */
	bin: number | null
	/** Sets the probed bin, or clears it with `null`. */
	set: (bin: number | null) => void
}

const [HeatmapFocusContext, useHeatmapFocus] = createContext<HeatmapFocus>('HeatmapFocus')

export { useHeatmapFocus }

/**
 * Owns the legend's probed bin, kept off the hover so a pointer move over the
 * plot never touches it. The cells and the legend read it. Only a legend probe,
 * not a grid hover, therefore repaints the cells to dim.
 *
 * @internal
 */
export function HeatmapFocusProvider({ children }: { children: ReactNode }) {
	const [bin, setBin] = useState<number | null>(null)

	const value = useMemo<HeatmapFocus>(() => ({ bin, set: setBin }), [bin])

	return <HeatmapFocusContext value={value}>{children}</HeatmapFocusContext>
}

/**
 * The hovered cell as its row-major index (`row * cols + col`), or `null`. The
 * pointer and the keyboard cursor both write it. It selects the index alone, so
 * a move inside one cell renders nothing.
 *
 * @internal
 */
export function useHoveredCell(): number | null {
	const store = useChartHoverStore()

	const index = () => store.get().index

	return useSyncExternalStore(store.subscribe, index, index)
}
