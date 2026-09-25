'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { createContext } from '../../core'
import type { QueryGroup } from '../query/engine/types'
import type { DashboardResizeEdge } from './engine/dashboard-resize'
import type { DashboardSelection } from './engine/dashboard-scope'
import type { DashboardStore } from './engine/dashboard-store'
import type { DashboardWidgetRegistry } from './types'

/**
 * The store of the nearest `Dashboard`. A tile reads it through a selector, so a
 * change wakes only the tiles whose selected value changed.
 *
 * @internal
 */
export const [DashboardStoreContext, useDashboardStoreContext] =
	createContext<DashboardStore>('Dashboard')

/**
 * The commands that a tile sends to the nearest `Dashboard`. The object keeps its
 * identity for the life of the dashboard.
 *
 * @internal
 */
export type DashboardActions = {
	/** Starts a pointer resize from the `pointerdown` of a handle. */
	beginResize: (
		id: string,
		edge: DashboardResizeEdge,
		event: ReactPointerEvent<HTMLElement>,
	) => void
	/** Applies one keyboard resize step, and commits it. */
	resizeBy: (id: string, edge: DashboardResizeEdge, dw: number, dh: number) => void
	/** Ends the live pointer resize of the tile `id` as canceled. It does nothing for another tile. */
	cancelResize: (id: string) => void
	/** Replaces the filter. */
	setFilter: (filter: QueryGroup) => void
	/** Replaces the selections through an update function. */
	updateSelections: (update: (current: DashboardSelection[]) => DashboardSelection[]) => void
	/** Reports an error that a tile caught. */
	reportError: (id: string, error: unknown) => void
}

/** @internal */
export const [DashboardActionsContext, useDashboardActions] =
	createContext<DashboardActions>('Dashboard')

/**
 * The id of the tile that encloses the reader, or `null` outside any tile. The
 * scope hooks read it, so each selection records the tile that made it.
 *
 * @internal
 */
export const [DashboardTileContext, useDashboardTileId] = createContext<string | null>(
	'DashboardTile',
	{ default: null },
)

/** The registry with nothing in it: each spec tile falls back. */
const NO_WIDGETS: DashboardWidgetRegistry = { widgets: {} }

/**
 * The widget kinds in scope, as `DashboardWidgetProvider` supplied them. With
 * no provider above, the registry is empty, and each spec tile states the gap.
 *
 * @internal
 */
export const [DashboardWidgetContext, useDashboardWidgets] = createContext<DashboardWidgetRegistry>(
	'DashboardWidgetProvider',
	{ default: NO_WIDGETS },
)
