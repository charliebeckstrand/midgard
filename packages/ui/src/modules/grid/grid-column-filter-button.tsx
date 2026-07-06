'use client'

import { ListFilter, ListFilterPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from '../../components/menu'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from '../../components/sheet'
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
import { columnLabel, type GridColumn } from './types'
import type { GridColumnFilter } from './use-grid-table'

/** The subset of a column the filter sheet reads. @internal */
type FilterColumn = Pick<GridColumn<unknown>, 'id' | 'title' | 'filterType' | 'filterOptions'>

/**
 * The single query field a column's filter sheet edits. A `select` field's
 * options are the column's explicit {@link GridColumn.filterOptions}, else the
 * supplied faceted values (the column's own data), else none.
 *
 * @internal
 */
function toQueryField(
	column: FilterColumn,
	options: { label: string; value: string }[] | undefined,
): QueryField {
	return {
		name: String(column.id),
		label: columnLabel(column),
		type: column.filterType ?? 'text',
		...(options ? { options } : {}),
	}
}

/** Props for {@link GridColumnFilterButton}. @internal */
type GridColumnFilterButtonProps = {
	column: FilterColumn
	filter: GridColumnFilter
	/**
	 * The column's current query tree, threaded as a prop (not read live off
	 * `filter`) so a change re-renders this button through the memoized header
	 * cell — keeping the active accent and the sheet's reopened draft in step
	 * with what's actually applied.
	 */
	query: QueryGroupNode | undefined
}

/**
 * Filter affordance for a filterable column header: an icon button opening a
 * right-side {@link Sheet} that hosts a single-field {@link QueryBuilder} — no
 * field selector, no nested groups, just operator + value rules joined by AND/OR.
 *
 * Edits accumulate in a local draft; nothing reaches the engine until the
 * sheet's **Apply** settles it, and dismissing (Cancel, Escape, backdrop)
 * discards the draft so the applied filter stands. While a filter is applied the
 * header button turns into a menu — **Edit filters** reopens the sheet on the
 * applied query, **Clear filters** lifts it outright — so a filter is cleared
 * without stepping through the sheet. The button reads accent from the applied
 * query, not the draft.
 *
 * @internal
 */
export function GridColumnFilterButton({ column, filter, query }: GridColumnFilterButtonProps) {
	// A `select` filter without explicit options offers the column's own values,
	// faceted from the data; explicit `filterOptions` always win. Computed each
	// render (cheap, engine-memoized) and keyed below so the field identity holds
	// while the values are unchanged — a fresh render on drawer-open refreshes them.
	const facetValues =
		column.filterType === 'select' && !column.filterOptions
			? filter.uniqueValues(column.id)
			: undefined

	// Null-joined content key so the field below holds its identity while the
	// faceted values are unchanged (the array itself is fresh each render).
	const facetKey = JSON.stringify(facetValues ?? null)

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-derives when the faceted values change via facetKey; facetValues is a fresh array each render
	const field = useMemo(
		() =>
			toQueryField(
				column,
				column.filterOptions ?? facetValues?.map((value) => ({ label: value, value })),
			),
		[column, facetKey],
	)

	const fields = useMemo(() => [field], [field])

	// A sheet with no applied query opens on one empty rule (text defaults to
	// `contains`); the applied query seeds the draft instead once it exists.
	const seeded = useMemo(() => {
		const rule = createRule(field)

		return createGroup('and', [field.type === 'text' ? { ...rule, operator: 'contains' } : rule])
	}, [field])

	const [open, setOpen] = useState(false)

	const [draft, setDraft] = useState<QueryGroupNode>(seeded)

	// Seed the draft from the applied query each time the sheet opens, so editing
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

	// Clear the applied filter outright — the one-press path to undo a filter,
	// distinct from Apply's commit and Cancel's discard. Offered from the header
	// menu the button becomes while a filter is applied (the sheet is closed then,
	// so there's no open state to settle).
	function clear() {
		filter.setQuery(column.id, undefined)
	}

	// Accent the button only when the applied query actually constrains rows — a
	// real value, or a value-less operator like "is empty" — not merely because a
	// rule exists (a freshly seeded, added-then-emptied, or all-cleared query).
	const active = query != null && isQueryActive(query, fields)

	const label = columnLabel(column)

	return (
		<>
			{active ? (
				// An applied filter turns the trigger into a menu: edit the query in the
				// sheet, or clear the filter without opening it. The trigger keeps the
				// accent (`color`), the "+"-marked icon, and the applied-state name.
				<Menu placement="bottom-end">
					<MenuTrigger>
						<Button
							variant="bare"
							color="blue"
							// Name carries the applied state so it isn't conveyed by colour
							// alone (WCAG 1.4.1 / 4.1.2); the menu's open state rides
							// aria-expanded, wired by MenuTrigger.
							aria-label={`Filter ${label}, active`}
							data-active={dataAttr(true)}
							className={cn(k.filter.button)}
						>
							{/* The active icon adds a "+" so the applied state reads by shape,
							    not the accent colour alone (WCAG 1.4.1). */}
							<Icon icon={<ListFilterPlus />} />
						</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem onAction={() => handleOpenChange(true)}>
							<MenuLabel>Edit filters</MenuLabel>
						</MenuItem>

						<MenuItem onAction={clear}>
							<MenuLabel>Clear filters</MenuLabel>
						</MenuItem>
					</MenuContent>
				</Menu>
			) : (
				<Button
					variant="bare"
					aria-label={`Filter ${label}`}
					aria-haspopup="dialog"
					aria-expanded={open}
					// The resting muted tint, dropped once a filter accents the button.
					className={cn(k.filter.button, k.filter.idle)}
					onClick={() => handleOpenChange(true)}
				>
					<Icon icon={<ListFilter />} />
				</Button>
			)}

			<Sheet open={open} onOpenChange={handleOpenChange} aria-label={`Filter ${label}`}>
				<SheetTitle>Filter {label}</SheetTitle>

				<SheetBody>
					<QueryBuilder
						fields={fields}
						hideFieldSelector
						allowGroups={false}
						requireRule
						value={draft}
						onValueChange={setDraft}
					/>
				</SheetBody>

				<SheetFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>

					<Button color="blue" onClick={apply}>
						Apply
					</Button>
				</SheetFooter>
			</Sheet>
		</>
	)
}
