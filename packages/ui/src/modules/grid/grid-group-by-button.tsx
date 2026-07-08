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
 * press it again to ungroup — a single toggle, so the accent, icon, and label
 * all track whether this column is the active group. The active column's button
 * holds a blue accent (like an applied column filter) and swaps its {@link Group}
 * icon for {@link Ungroup}; `aria-pressed` carries the same state, so it isn't
 * conveyed by colour alone. Renders nothing while the feature is off, on a
 * non-`groupable` column, or on an empty grid.
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

	const label = columnLabel(column)

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
					// A toggle whose label names the column; `aria-pressed` carries the
					// grouped state so it reads without the accent colour (WCAG 1.4.1).
					aria-pressed={grouped}
					aria-label={`Group by ${label}`}
					className={cn(k.groupButton.button, !grouped && k.groupButton.idle)}
					onClick={() => context.setGrouping(grouped ? null : column.id)}
				>
					<Icon icon={grouped ? <Ungroup /> : <Group />} />
				</Button>
			</TooltipTrigger>

			{/* Names the column dynamically, mirroring the header context menu's item. */}
			<TooltipContent>Group by {label}</TooltipContent>
		</Tooltip>
	)
}
