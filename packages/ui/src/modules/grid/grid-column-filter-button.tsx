'use client'

import { ListFilter } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import {
	createGroup,
	createRule,
	QueryBuilder,
	type QueryField,
	type QueryGroupNode,
} from '../query'
import type { GridColumn } from './types'
import type { GridColumnFilter } from './use-grid-table'

/** The subset of a column the filter popover reads. @internal */
type FilterColumn = Pick<GridColumn<unknown>, 'id' | 'title' | 'filterType' | 'filterOptions'>

/** A column's filter label: its `title` when a string, else the stringified id. @internal */
function filterLabel(column: Pick<GridColumn<unknown>, 'id' | 'title'>): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}

/** The single query field a column's filter popover edits. @internal */
function toQueryField(column: FilterColumn): QueryField {
	return {
		name: String(column.id),
		label: filterLabel(column),
		type: column.filterType ?? 'text',
		...(column.filterOptions ? { options: column.filterOptions } : {}),
	}
}

/** Props for {@link GridColumnFilterButton}. @internal */
type GridColumnFilterButtonProps = {
	column: FilterColumn
	filter: GridColumnFilter
	/**
	 * The column's current query tree, threaded as a prop (not read live off
	 * `filter`) so a change re-renders this button through the memoized header
	 * cell — otherwise the controlled {@link QueryBuilder} would freeze on its
	 * seed and never reflect an edit.
	 */
	query: QueryGroupNode | undefined
}

/**
 * Filter affordance for a filterable column header: an icon button opening a
 * {@link Popover} that hosts a single-field {@link QueryBuilder} — no field
 * selector, no nested groups, just operator + value rules joined by AND/OR.
 * Edits drive the engine's per-column query; the button reads accent while a
 * rule is active.
 *
 * @internal
 */
export function GridColumnFilterButton({ column, filter, query }: GridColumnFilterButtonProps) {
	const field = useMemo(() => toQueryField(column), [column])

	const fields = useMemo(() => [field], [field])

	// A fresh popover opens on one empty rule (text defaults to `contains`); the
	// engine's stored query takes over once the user edits.
	const seeded = useMemo(() => {
		const rule = createRule(field)

		return createGroup('and', [field.type === 'text' ? { ...rule, operator: 'contains' } : rule])
	}, [field])

	const active = (query?.children.length ?? 0) > 0

	const label = filterLabel(column)

	return (
		// Prefer opening above the header; floating-ui flips below on collision.
		<Popover placement="top">
			<PopoverTrigger>
				<Button
					variant="bare"
					// An active filter accents the button through its `color`; the resting
					// muted tint drops so it doesn't override that colour.
					color={active ? 'blue' : undefined}
					aria-label={`Filter ${label}`}
					data-active={dataAttr(active)}
					className={cn(k.filter.button, !active && k.filter.idle)}
				>
					<Icon icon={<ListFilter />} />
				</Button>
			</PopoverTrigger>

			<PopoverContent className={cn(k.filter.popover)} autoFocus modal>
				<QueryBuilder
					fields={fields}
					hideFieldSelector
					allowGroups={false}
					value={query ?? seeded}
					onValueChange={(next) => filter.setQuery(column.id, next)}
				/>
			</PopoverContent>
		</Popover>
	)
}
