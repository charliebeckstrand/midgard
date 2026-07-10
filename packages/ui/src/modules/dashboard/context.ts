'use client'

import type { ReactNode, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { createContext } from '../../core'
import type { LayoutCell } from './dashboard-layout'
import type { CellConstraints } from './dashboard-responsive'

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
	/**
	 * Whether editing gestures are live: the `editing` prop, gated off while
	 * the responsive derivation is reshaping the layout — edits apply to the
	 * canonical layout, so they are only offered while it is what renders.
	 */
	editing: boolean
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
	/** The live drag-overlay content by id, written by each item as it renders. */
	overlay: RefObject<Map<string, ReactNode>>
}

export const [DashboardContext, useDashboard] = createContext<DashboardContextValue>('Dashboard')
