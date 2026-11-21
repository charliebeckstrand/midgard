'use client'

import { useCallback } from 'react'
import { Button } from '../../components/button'
import { IntlMessage } from '../../primitives/intl'
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
	/** Clears a selection that the app holds and the tile shows. While it is set, the control shows. */
	onClear?: (() => void) | undefined
}

/**
 * The control that clears the selection of a tile. It shows only while the tile
 * holds a selection, in the header row, so the user can release a selection
 * where they made it. A selection that the app holds, such as an active chat
 * citation, shows it too, through `onClear`. It subscribes to the store by
 * itself, so a selection change never renders the tile again.
 *
 * @internal
 */
export function DashboardTileClear({ id, label, onClear }: DashboardTileClearProps) {
	const intl = useIntl()

	const selecting = useDashboardStore(
		useCallback(
			(_: DashboardView, state: DashboardState) =>
				state.selections.some((item) => item.source === id),
			[id],
		),
	)

	const { updateSelections } = useDashboardActions()

	// A tile that holds only a selection of the app sends no change of the
	// cross-filter value.
	const handleClear = useCallback(() => {
		onClear?.()

		if (selecting) updateSelections((prev) => clearSelection(prev, id))
	}, [onClear, selecting, updateSelections, id])

	if (!selecting && onClear === undefined) return null

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
