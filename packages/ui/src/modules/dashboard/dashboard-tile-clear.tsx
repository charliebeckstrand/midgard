'use client'

import { useCallback } from 'react'
import { Button } from '../../components/button'
import { IntlMessage } from '../../primitives/intl/intl-message'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { useDashboardActions } from './context'
import { dashboardMessages } from './dashboard-messages'
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
	const intl = useIntl()

	const selecting = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) =>
				state.selections.some((item) => item.source === id),
			[id],
		),
	)

	const { updateSelections } = useDashboardActions()

	const handleClear = useCallback(
		() => updateSelections((prev) => clearSelection(prev, id)),
		[updateSelections, id],
	)

	if (!selecting) return null

	return (
		<Button
			data-slot="dashboard-tile-clear"
			// `Button` sets no `type`, and a `submit` would send an enclosing form.
			type="button"
			variant="plain"
			onClick={handleClear}
			aria-label={intl.formatMessage(dashboardMessages.clearSelection, { label })}
		>
			<IntlMessage message={intlMessages.clear} />
		</Button>
	)
}
