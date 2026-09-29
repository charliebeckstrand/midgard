'use client'

import type { SubmitEvent } from 'react'
import { Button } from '../../components/button'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from '../../components/sheet'
import { QueryBuilder, type QueryField, type QueryGroup } from '../query'
import { GridOverlayDensity } from './grid-region'

/** Props for {@link GridColumnFilterSheet}. @internal */
type GridColumnFilterSheetProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The column name, which the title and the dialog name quote. */
	label: string
	/** The one field of the column. */
	fields: QueryField[]
	/** The query that the sheet edits. Nothing reaches the grid until Apply. */
	draft: QueryGroup
	onDraftChange: (draft: QueryGroup) => void
	/** Settles the draft onto the grid. Apply and Enter in a rule input call it. */
	onApply: () => void
}

/**
 * The sheet of {@link GridColumnFilterButton}: a single-field
 * {@link QueryBuilder} with Cancel and Apply. The button owns the draft and the
 * open state.
 *
 * It is a module of its own because the query builder carries the date picker
 * and the calendar. The button loads it on the first open, so a grid that
 * nobody filters does not ship that code.
 *
 * @internal
 */
export function GridColumnFilterSheet({
	open,
	onOpenChange,
	label,
	fields,
	draft,
	onDraftChange,
	onApply,
}: GridColumnFilterSheetProps) {
	// The sheet body + footer form a `<form>`, so Enter in any rule input settles
	// the draft — the same commit as the Apply submit button. preventDefault stops
	// the browser's native navigation before applying. React bubbles a submit
	// through the portal, so the submit stops here, and a form around the grid
	// does not submit too.
	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault()

		event.stopPropagation()

		onApply()
	}

	return (
		<GridOverlayDensity>
			<Sheet open={open} onOpenChange={onOpenChange} aria-label={`Filter “${label}”`}>
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
							onValueChange={onDraftChange}
						/>
					</SheetBody>

					<SheetFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>

						<Button type="submit" color="blue">
							Apply
						</Button>
					</SheetFooter>
				</form>
			</Sheet>
		</GridOverlayDensity>
	)
}
