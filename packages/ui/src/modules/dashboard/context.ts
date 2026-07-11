'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { createContext } from '../../core'
import type { CellConstraints } from './dashboard-constraints'
import type { LayoutCell } from './dashboard-layout'

/** The edges a tile resizes from; the corner drives both axes at once. @internal */
export type DashboardResizeEdge = 'e' | 's' | 'se'

/**
 * What the grid shares with its items: the painted layout, the measured
 * pitch, and the gesture channels. One context — a dashboard holds tens of
 * tiles, not thousands, and the tiles' own children are referentially
 * stable, so a preview churn re-renders only the cheap positioned shells.
 *
 * @internal
 */
export type DashboardContextValue = {
	/** Whether editing gestures are live — the grid's `editing` prop. */
	editing: boolean
	/**
	 * The board is re-packing responsively (or settling out of it), so a tile's
	 * cell change snaps rather than gliding: the glide exists for the drag
	 * reflow, and animating a wholesale responsive re-pack would let a fill
	 * chart inside — which commits its measured size a frame late — track a
	 * visibly wrong size across the animation.
	 */
	repacking: boolean
	/** The grid's column count. */
	columns: number
	/** The gutter in px, rendered as a half-gap inset inside each cell. */
	gap: number
	/** The row count the percentage math divides by — the painted bottom edge. */
	maxRow: number
	/** The painted layout by id: the gesture preview while one is live, else the rendered layout. */
	cells: ReadonlyMap<string, LayoutCell>
	/** Measured column pitch in px; `0` before the first measurement. */
	columnPitch: number
	/** Registers an item's content demands; returns the unregister. */
	register: (id: string, constraints: CellConstraints) => () => void
	/** The dragged tile's id, or `null` at rest. */
	activeId: string | null
	/** The resized tile's id, or `null` at rest. */
	resizingId: string | null
	/** Starts a pointer resize from a handle's `pointerdown`. */
	beginResize: (id: string, edge: DashboardResizeEdge, event: ReactPointerEvent) => void
	/** Applies one keyboard resize step, committing immediately. */
	resizeBy: (id: string, edge: DashboardResizeEdge, dw: number, dh: number) => void
}

export const [DashboardContext, useDashboard] = createContext<DashboardContextValue>('Dashboard')
