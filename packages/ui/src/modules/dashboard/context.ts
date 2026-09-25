'use client'

import { createContext } from '../../core'
import type { QueryGroup } from '../query/engine/types'
import type { DashboardTileRank } from './engine/dashboard-layout'
import type { DashboardSelection } from './engine/dashboard-scope'
import type { DashboardStore } from './engine/dashboard-store'
import type { DashboardWidgetRegistry } from './types'
import type { DashboardResizeHandlers } from './use-dashboard-resize'

/**
 * The store of the nearest `Dashboard`. A tile reads it through a selector, so a
 * change wakes only the tiles whose selected value changed.
 *
 * @internal
 */
export const [DashboardStoreContext, useDashboardStoreContext] =
	createContext<DashboardStore>('Dashboard')

/**
 * The commands that a tile sends to the nearest `Dashboard`: the resize
 * handlers, and the scope and error commands. The object keeps its identity for
 * the life of the dashboard.
 *
 * @internal
 */
export type DashboardActions = DashboardResizeHandlers & {
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

/**
 * The rank of the tiles under the reader, and whether a `DashboardTiles` there
 * adds the index of each spec tile to it.
 *
 * @internal
 */
export type DashboardTileRankScope = {
	/** The rank that a tile under the reader registers. */
	rank: DashboardTileRank
	/**
	 * Whether a `DashboardTiles` under the reader adds the index of each spec tile
	 * to the rank. Only the scope of a `DashboardTiles` child of the board does.
	 */
	indexed: boolean
}

/**
 * The place in the markup of the tiles under the reader. `Dashboard` gives each
 * of its children a slot, and a `DashboardTiles` child adds the index of each
 * spec tile. A tile registers the rank, so the tiles with no entry take their
 * rows in markup order.
 *
 * @remarks
 * The tiles that one component renders share its slot and the index `0`, also
 * the spec tiles of a `DashboardTiles` in it. A tie keeps the mount order, and
 * the tiles that mount in one commit mount in markup order.
 *
 * With no provider above it, as in a portal child of the board, a tile takes the
 * rank `[0, 0]`.
 *
 * @internal
 */
export const [DashboardTileRankContext, useDashboardTileRank] =
	createContext<DashboardTileRankScope>('DashboardTileRank', {
		default: { rank: [0, 0], indexed: false },
	})

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
