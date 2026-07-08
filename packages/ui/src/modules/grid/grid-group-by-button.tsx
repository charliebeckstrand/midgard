'use client'

import { Group, Ungroup } from 'lucide-react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { cn, createContext, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { columnLabel, type GridColumn } from './types'

/**
 * The group-by wiring {@link GridGroupByButton} reads: the active grouped
 * column id, the binding write-back, and the enabled gate. `null` (the default)
 * means the feature is off, so the button renders nothing.
 *
 * @internal
 */
export type GridGroupByContextValue = {
	/** The active grouped column id, or `null` when ungrouped. */
	grouping: (string | number) | null
	/** Writes the grouped column id (or `null` to ungroup) through the `groupBy` binding. */
	setGrouping: (next: (string | number) | null) => void
	/** Whether the header affordances are live — false on an empty/loading grid, like the other header chrome. */
	enabled: boolean
}

/** Carries the group-by wiring from `GridData` to the header buttons. @internal */
export const [GridGroupByContext, useGridGroupByButton] =
	createContext<GridGroupByContextValue | null>('GridGroupByButton', { default: null })

/**
 * A groupable column's header button: press it to group the rows by the column,
 * press it again to ungroup. The action reads off whether this column is the
 * active group — "Group by {column}" ungrouped, a plain "Ungroup" once grouped
 * (single-level, so only one column is ever grouped). The active button holds a
 * blue accent (like an applied column filter) and swaps its {@link Group} icon
 * for {@link Ungroup}, so its state reads by shape and label, not colour alone.
 * Renders nothing while the feature is off, on a non-`groupable` column, or on
 * an empty grid.
 *
 * @internal
 */
export function GridGroupByButton({
	column,
}: {
	column: Pick<GridColumn<unknown>, 'id' | 'title' | 'groupable'>
}) {
	const context = useGridGroupByButton()

	if (!context?.enabled || !column.groupable) return null

	const grouped = column.id === context.grouping

	// The action the press performs, doubling as the accessible name and tooltip:
	// name the column when grouping, but a bare "Ungroup" when clearing it.
	const action = grouped ? 'Ungroup' : `Group by ${columnLabel(column)}`

	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					variant="bare"
					// The blue accent marks the active group, matching an applied filter's
					// button; `idle` is the resting muted tint, dropped once accented so it
					// doesn't override the colour.
					color={grouped ? 'blue' : undefined}
					data-active={dataAttr(grouped)}
					aria-label={action}
					className={cn(k.groupButton.button, !grouped && k.groupButton.idle)}
					onClick={() => context.setGrouping(grouped ? null : column.id)}
				>
					<Icon icon={grouped ? <Ungroup /> : <Group />} />
				</Button>
			</TooltipTrigger>

			<TooltipContent>{action}</TooltipContent>
		</Tooltip>
	)
}
