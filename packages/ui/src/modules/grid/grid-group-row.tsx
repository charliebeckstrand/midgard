'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation } from './engine/grid-aggregate'
import { groupValueLabel } from './engine/grid-column/label'
import type { GridGroup } from './engine/grid-group/tree'
import { groupItemKey } from './engine/grid-items/items'
import type { GridWindowRowProps } from './engine/grid-row/shell'
import { GridAggregateCells } from './grid-aggregate-cells'
import type { GridGroupBy } from './grid-data-types'
import type { GridColumn } from './types'
import { useGridNavContext } from './use-grid-navigation'
import { GridNavCell, useGridNavStopProps } from './use-grid-navigation-columns'

/** Props for {@link GridGroupRow}. @internal */
type GridGroupRowProps<T> = {
	/** The group this row heads. */
	group: GridGroup<T>
	/** Opens or closes a group, by its id. */
	onToggle: (id: string) => void
	/** The visible columns, in render order — the label span and aggregate cells derive from them. */
	columns: GridColumn<T>[]
	/** The grouped column id, which a `renderHeader` override receives. */
	columnId: string | number
	/** Header-label override; falls back to `value (count)`. */
	renderHeader: GridGroupBy['renderHeader']
	/** The group's overlay color: colors the leading rail and washes the header's aggregate cells; `undefined` leaves them neutral. */
	color?: PaletteColor
} & GridWindowRowProps

/**
 * A group-header row carrying a bare disclosure button that toggles the group's
 * expansion. The group's shared value and row count (`Developer (3)`) sit at the
 * start. A chevron at the trailing edge points right while collapsed and down
 * while expanded. A
 * {@link GridGroupBy.renderHeader} override replaces the value/count label; the
 * toggle and chevron stay. Without aggregation the row is one full-width cell.
 * Once any column aggregates, the label spans only the columns before the first
 * aggregated one, and each aggregated column carries the group's figure. A
 * collapsed group therefore still reads its totals off its header.
 *
 * @internal
 */
export function GridGroupRow<T>({
	group,
	onToggle,
	columns,
	columnId,
	renderHeader,
	color,
	...windowRow
}: GridGroupRowProps<T>) {
	const { expanded, value } = group

	// The group size, after the filters, since filtering prunes the leaves.
	const count = group.leaves.length

	const label: ReactNode = renderHeader
		? renderHeader({ columnId, value, count })
		: `${groupValueLabel(value)} (${count})`

	const aggregated = hasAggregation(columns)

	const span = aggregated ? aggregateLabelSpan(columns) : columns.length

	const navKey = groupItemKey(group.id)

	const stopProps = useGridNavStopProps(navKey)

	// The cursor makes a client-grouped grid a treegrid. The header is its top level.
	const tree = useGridNavContext().enabled

	return (
		// `data-group-key` (the shared value) lets the group-header context menu
		// resolve the right-clicked group for the row manager and its color/expand items.
		<TableRow
			{...windowRow}
			data-group-row
			data-group-key={String(value)}
			data-expanded={dataAttr(expanded)}
			aria-level={tree ? 1 : undefined}
			aria-expanded={tree ? expanded : undefined}
		>
			<TableCell
				{...stopProps}
				colSpan={span}
				className={cn(k.rowGroup.rail.padded, color && k.rowGroup.rail.color[color])}
			>
				<Button
					type="button"
					variant="bare"
					onClick={() => onToggle(group.id)}
					aria-expanded={expanded}
					aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${groupValueLabel(value)}`}
					className="p-0"
					suffix={
						<Icon
							icon={expanded ? <ChevronDown /> : <ChevronRight />}
							className={cn(k.rowGroup.chevron)}
						/>
					}
				>
					{label}
				</Button>
				<GridNavCell stop={navKey} />
			</TableCell>

			{aggregated && (
				<GridAggregateCells columns={columns} rows={group.rows} from={span} color={color} />
			)}
		</TableRow>
	)
}
