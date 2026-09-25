'use client'

import { useCallback } from 'react'
import { Button } from '../../components/button'
import { useDashboardActions } from './context'
import { clearSelection } from './engine/dashboard-scope'
import type { DashboardState, DashboardView } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/** Props for {@link DashboardTileClear}. @internal */
export type DashboardTileClearProps = {
	/** The id of the tile. */
	id: string
	/** The name of the tile, for the accessible name of the button. */
	label: string
}

/**
 * The control that clears the selection of a tile. It shows only while the tile
 * holds a selection, in the header row, so the user can release a selection
 * where they made it. It subscribes to the store by itself, so a selection change
 * never renders the tile again.
 *
 * @internal
 */
export function DashboardTileClear({ id, label }: DashboardTileClearProps) {
	const selecting = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) =>
				state.selections.some((item) => item.source === id),
			[id],
		),
	)

	const { updateSelections } = useDashboardActions()

	const clear = useCallback(
		() => updateSelections((current) => clearSelection(current, id)),
		[updateSelections, id],
	)

	if (!selecting) return null

	return (
		<Button
			data-slot="dashboard-tile-clear"
			variant="plain"
			onClick={clear}
			aria-label={`Clear the selection in ${label}`}
		>
			Clear
		</Button>
	)
}
