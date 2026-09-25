'use client'

import { useState } from 'react'
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
 * The rank of the tiles under the reader, and whether each reader there takes a
 * group of its own.
 *
 * @internal
 */
export type DashboardTileRankScope = {
	/** The rank that a tile under the reader registers. */
	rank: DashboardTileRank
	/**
	 * Whether each `DashboardTiles` and each `DashboardTile` under the reader takes
	 * a group of its own when it mounts. Only the scope of a board child that is
	 * not a tile or a `DashboardTiles`, such as a component, does.
	 */
	grouped: boolean
}

/**
 * The place in the markup of the tiles under the reader. `Dashboard` gives each
 * of its children a slot, and a `DashboardTiles` adds the index of each spec
 * tile. Read it through {@link useDashboardTileRank}.
 *
 * @remarks
 * With no provider above it, as in a portal child of the board, a tile takes the
 * rank `[0, 0, 0]`.
 *
 * @internal
 */
export const [DashboardTileRankContext, useDashboardTileRankScope] =
	createContext<DashboardTileRankScope>('DashboardTileRank', {
		default: { rank: [0, 0, 0], grouped: false },
	})

/**
 * The last group that a reader of a grouped scope took. All boards share the
 * sequence, because a group compares only with the groups of its own slot.
 */
let lastGroup = 0

/** The next group. The sequence only goes up, so a new group comes after each earlier group. */
function nextGroup(): number {
	lastGroup += 1

	return lastGroup
}

/**
 * The rank of the reader in the markup of the board. A `DashboardTiles` adds the
 * index of each spec tile to it, and a `DashboardTile` registers it. The tiles
 * with no entry thus take their rows in markup order.
 *
 * @remarks
 * In a grouped scope, the reader takes the next group when it mounts, and it
 * keeps that group. React renders the elements of one commit in markup order,
 * so their groups follow the markup. An element that mounts later takes a later
 * group. StrictMode calls the initializer twice, which skips a group and keeps
 * the order.
 *
 * @internal
 */
export function useDashboardTileRank(): DashboardTileRank {
	const { rank, grouped } = useDashboardTileRankScope()

	const [group] = useState(() => (grouped ? nextGroup() : 0))

	return grouped ? [rank[0], group, rank[2]] : rank
}

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
