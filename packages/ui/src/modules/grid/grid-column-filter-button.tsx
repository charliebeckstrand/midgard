'use client'

import { ListFilter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/button'
import { Drawer, DrawerBody, DrawerFooter, DrawerTitle } from '../../components/drawer'
import { Icon } from '../../components/icon'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import {
	createGroup,
	createRule,
	isQueryActive,
	QueryBuilder,
	type QueryField,
	type QueryGroupNode,
} from '../query'
import type { GridColumn } from './types'
import type { GridColumnFilter } from './use-grid-table'

/** The subset of a column the filter drawer reads. @internal */
type FilterColumn = Pick<GridColumn<unknown>, 'id' | 'title' | 'filterType' | 'filterOptions'>

/** A column's filter label: its `title` when a string, else the stringified id. @internal */
function filterLabel(column: Pick<GridColumn<unknown>, 'id' | 'title'>): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}

/** The single query field a column's filter drawer edits. @internal */
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
	 * cell — keeping the active accent and the drawer's reopened draft in step
	 * with what's actually applied.
	 */
	query: QueryGroupNode | undefined
}

/**
 * Filter affordance for a filterable column header: an icon button opening a
 * {@link Drawer} that hosts a single-field {@link QueryBuilder} — no field
 * selector, no nested groups, just operator + value rules joined by AND/OR.
 *
 * Edits accumulate in a local draft; nothing reaches the engine until the
 * drawer's **Apply** settles it, and dismissing (Cancel, Escape, backdrop)
 * discards the draft so the applied filter stands. The button reads accent from
 * the applied query, not the draft.
 *
 * @internal
 */
export function GridColumnFilterButton({ column, filter, query }: GridColumnFilterButtonProps) {
	const field = useMemo(() => toQueryField(column), [column])

	const fields = useMemo(() => [field], [field])

	// A drawer with no applied query opens on one empty rule (text defaults to
	// `contains`); the applied query seeds the draft instead once it exists.
	const seeded = useMemo(() => {
		const rule = createRule(field)

		return createGroup('and', [field.type === 'text' ? { ...rule, operator: 'contains' } : rule])
	}, [field])

	const [open, setOpen] = useState(false)

	const [draft, setDraft] = useState<QueryGroupNode>(seeded)

	// Seed the draft from the applied query each time the drawer opens, so editing
	// always resumes from what's in effect; an unapplied draft is dropped on close.
	function handleOpenChange(next: boolean) {
		if (next) setDraft(query ?? seeded)

		setOpen(next)
	}

	// Settle the draft onto the engine and close. A draft of only blank rules
	// applies as "no constraint" (the evaluator skips value-less rules), so Apply
	// doubles as a clear.
	function apply() {
		filter.setQuery(column.id, draft)

		setOpen(false)
	}

	// Accent the button only when the applied query actually constrains rows — a
	// real value, or a value-less operator like "is empty" — not merely because a
	// rule exists (a freshly seeded, added-then-emptied, or all-cleared query).
	const active = query != null && isQueryActive(query, fields)

	const label = filterLabel(column)

	return (
		<>
			<Button
				variant="bare"
				// An active filter accents the button through its `color`; the resting
				// muted tint drops so it doesn't override that colour.
				color={active ? 'blue' : undefined}
				aria-label={`Filter ${label}`}
				aria-haspopup="dialog"
				aria-expanded={open}
				data-active={dataAttr(active)}
				className={cn(k.filter.button, !active && k.filter.idle)}
				onClick={() => handleOpenChange(true)}
			>
				<Icon icon={<ListFilter />} />
			</Button>

			<Drawer open={open} onOpenChange={handleOpenChange} aria-label={`Filter ${label}`}>
				<DrawerTitle>Filter {label}</DrawerTitle>

				<DrawerBody>
					<div className={cn(k.filter.drawerContent)}>
						<QueryBuilder
							fields={fields}
							hideFieldSelector
							allowGroups={false}
							requireRule
							value={draft}
							onValueChange={setDraft}
						/>
					</div>
				</DrawerBody>

				<DrawerFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>

					<Button color="blue" onClick={apply}>
						Apply
					</Button>
				</DrawerFooter>
			</Drawer>
		</>
	)
}
