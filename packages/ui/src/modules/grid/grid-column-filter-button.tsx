'use client'

import { ListFilter, ListFilterPlus } from 'lucide-react'
import { type SubmitEvent, useEffect, useEffectEvent, useMemo, useState } from 'react'
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
	type QueryGroup,
} from '../query'
import { columnLabel } from './engine/grid-column/label'
import { GridOverlayDensity, useGridOverlayDensity } from './grid-region'
import type { GridColumn } from './types'
import type { GridColumnFacets, GridColumnFilter } from './use-grid-table'

/** The subset of a column the filter sheet reads. @internal */
type FilterColumn = Pick<GridColumn<unknown>, 'id' | 'title' | 'filterType' | 'filterOptions'>

/**
 * The single query field a column's filter sheet edits. A `select` field's
 * options are the column's explicit {@link GridColumn.filterOptions}, else the
 * supplied faceted values (the column's own data), else none. A `number`
 * field's `span` is the faceted `[min, max]` of the column's own data.
 *
 * @internal
 */
function toQueryField(
	column: FilterColumn,
	options: { label: string; value: string }[] | undefined,
	span: QueryField['span'],
): QueryField {
	return {
		name: String(column.id),
		label: columnLabel(column),
		type: column.filterType ?? 'text',
		...(options ? { options } : {}),
		...(span ? { span } : {}),
	}
}

/** Whether the column's sheet offers facets: a `select` without explicit options, or a `number`. @internal */
function takesFacets(column: FilterColumn): boolean {
	return (column.filterType === 'select' && !column.filterOptions) || column.filterType === 'number'
}

/**
 * The field of the column's sheet. A `select` filter without explicit options
 * offers the column's own faceted values, and a `number` filter's `between`
 * editor clamps to the column's faceted span.
 *
 * @internal
 */
function sheetField(column: FilterColumn, facets: GridColumnFacets | null): QueryField {
	const options =
		column.filterOptions ??
		(column.filterType === 'select'
			? facets?.values.map((value) => ({ label: value, value }))
			: undefined)

	return toQueryField(column, options, column.filterType === 'number' ? facets?.span : undefined)
}

/** The query a sheet opens on with no applied query: one empty rule, `contains` for text. @internal */
function seedQuery(field: QueryField): QueryGroup {
	const rule = createRule(field)

	return createGroup('and', [field.type === 'text' ? { ...rule, operator: 'contains' } : rule])
}

/** Props for {@link GridColumnFilterButton}. @internal */
type GridColumnFilterButtonProps = {
	column: FilterColumn
	filter: GridColumnFilter
	/**
	 * The column's current query tree, threaded as a prop rather than read live
	 * off `filter`. A change therefore re-renders this button through the memoized
	 * header cell. That keeps the active accent and the sheet's reopened draft in
	 * step with what's actually applied.
	 */
	query: QueryGroup | undefined
}

/**
 * Filter affordance for a filterable column header: an icon button opening a
 * right-side {@link Sheet} that hosts a single-field {@link QueryBuilder}. There
 * is no field selector and no nested groups, just operator + value rules joined
 * by AND/OR.
 *
 * Edits accumulate in a local draft, and nothing reaches the engine until the
 * sheet's **Apply** settles it. Dismissing (Cancel, Escape, backdrop) discards
 * the draft, so the applied filter stands. While a filter is applied the header
 * button turns into a menu. **Edit filters** reopens the sheet on the applied
 * query, and **Clear filters** lifts it outright. A filter is therefore cleared
 * without stepping through the sheet. The button reads accent from the applied
 * query, not the draft.
 *
 * @internal
 */
export function GridColumnFilterButton({ column, filter, query }: GridColumnFilterButtonProps) {
	// The facets the sheet offers, read from the engine as the sheet opens. They
	// change with the rows and the other filters, so each open reads them again.
	// They stay after a close, so the sheet keeps its options while it animates out.
	const [facets, setFacets] = useState<GridColumnFacets | null>(null)

	const field = useMemo(() => sheetField(column, facets), [column, facets])

	const fields = useMemo(() => [field], [field])

	const [open, setOpen] = useState(false)

	// The density this column's overlays render at — the grid's surroundings, not its
	// cells (see `GridOverlayDensity`).
	const overlayDensity = useGridOverlayDensity()

	const [draft, setDraft] = useState<QueryGroup>(() => seedQuery(field))

	// Open the sheet on the applied query, so editing always resumes from what's in
	// effect. With no applied query it opens on one empty rule. An unapplied draft
	// is dropped on close.
	function openSheet() {
		const next = takesFacets(column) ? filter.facets(column.id) : null

		setFacets(next)

		setDraft(query ?? seedQuery(sheetField(column, next)))

		setOpen(true)
	}

	// Close the sheet and, if it was opened from the right-click menu (the `'menu'`
	// affordance), consume that request so it doesn't immediately reopen.
	function closeSheet() {
		setOpen(false)

		if (filter.openColumn === column.id) filter.requestOpen(null)
	}

	function handleOpenChange(next: boolean) {
		if (next) openSheet()
		else closeSheet()
	}

	// The `'menu'` affordance opens this column's sheet from the context menu (there
	// is no resting header funnel to click). The effect runs only on a fresh
	// request for this column, so a query change can't clobber an edit in flight.
	const onOpenRequest = useEffectEvent(openSheet)

	useEffect(() => {
		if (filter.openColumn === column.id) onOpenRequest()
	}, [filter.openColumn, column.id])

	// Settle the draft onto the engine and close. A draft of only blank rules
	// applies as "no constraint" (the evaluator skips value-less rules), so Apply
	// doubles as a clear.
	function apply() {
		filter.setQuery(column.id, draft)

		closeSheet()
	}

	// The sheet body + footer form a `<form>`, so Enter in any rule input settles
	// the draft — the same commit as the Apply submit button. preventDefault stops
	// the browser's native navigation before applying.
	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault()

		apply()
	}

	// Clear the applied filter outright — the one-press path to undo a filter,
	// distinct from Apply's commit and Cancel's discard. Offered from the header
	// menu the button becomes while a filter is applied (the sheet is closed then,
	// so there's no open state to settle).
	function clear() {
		filter.setQuery(column.id, undefined)
	}

	// Accent the button only when the applied query actually constrains rows — a
	// real value, or a value-less operator like "is Empty" — not merely because a
	// rule exists (a freshly seeded, added-then-emptied, or all-cleared query).
	const active = query != null && isQueryActive(query)

	// In the `'menu'` affordance the resting funnel is dropped — the filter lives in
	// the column's right-click menu, so the header keeps its full width. `'header'`
	// always shows it. Read only where no filter is applied: an active filter turns
	// the trigger into the edit/clear menu below either way, and the sheet renders
	// regardless, so the menu can open it under both affordances.
	const showRestingFunnel = filter.affordance !== 'menu'

	const label = columnLabel(column)

	return (
		<>
			{active ? (
				// An applied filter turns the trigger into a menu: edit the query in the
				// sheet, or clear the filter without opening it. The trigger keeps the
				// accent (`color`), the "+"-marked icon, and the applied-state name.
				//
				// `size` rather than wrapping the surface: `useMenuState` resolves the panel's
				// density from `useDensity()` at this root, and `MenuContent` re-broadcasts
				// that *inside* its own subtree — so a wrapper around `MenuContent` is
				// overridden and does nothing. Passing the step here wins, and leaves the
				// trigger below on the header's own cell cascade where it belongs.
				<Menu placement="bottom-end" size={overlayDensity.size}>
					<MenuTrigger>
						<Button
							type="button"
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
			) : showRestingFunnel ? (
				<Button
					type="button"
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
			) : null}

			<GridOverlayDensity>
				<Sheet open={open} onOpenChange={handleOpenChange} aria-label={`Filter “${label}”`}>
					{/* A `contents` form so Enter in a rule input submits (Apply) without
				    imposing a box — the panel's `gap-4` slot rhythm survives the
				    display:contents wrapper. It spans the title too so the body stays a
				    non-first child, keeping its `first:` top padding off. */}
					<form className="contents" onSubmit={submit}>
						{/* The column name is quoted, as the row that opens this sheet quotes
						    it. The name therefore reads as the column being filtered, rather
						    than as part of the title's own wording. The dialog's `aria-label` above
						    carries the same string. */}
						<SheetTitle>Filter “{label}”</SheetTitle>

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
							<Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
								Cancel
							</Button>

							<Button type="submit" color="blue">
								Apply
							</Button>
						</SheetFooter>
					</form>
				</Sheet>
			</GridOverlayDensity>
		</>
	)
}
