'use client'

import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useRef, useState } from 'react'
import { TableCell, TableRow } from '../../components/table'
import { announce, cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { inferEditorKind, isColumnEditable } from './engine/grid-editing-utilities'
import { GridEditInputs } from './grid-edit-inputs'
import type { GridNewRowConfig } from './grid-editing-types'
import type { GridColumn } from './types'

/** Props for one entry cell: its column, the shared staging, and the row commit. @internal */
type GridNewRowCellProps<T> = {
	column: GridColumn<T>
	/** A data row to infer the editor kind from (the first rendered row); text when the grid is empty. */
	sample: T | undefined
	stage: (columnId: string | number, value: unknown) => void
	unstage: (columnId: string | number) => void
	/** The staged values so far, handed to the column's `validate` as its row argument. */
	readValues: () => Record<string, unknown>
	commitRow: () => void
}

/**
 * One editable cell of the entry row: a local draft over the shared inline
 * editors, staged into the row's value map. Enter in an inferred text/number
 * editor commits the whole entry row (the editors' usual commit key); a slot
 * only stages — a control's pick must not submit a half-filled row. A failed
 * `validate` (receiving the staged values as its row) rings the editor and
 * shows the message; the invalid cell is dropped at commit.
 *
 * @internal
 */
function GridNewRowCell<T>({
	column,
	sample,
	stage,
	unstage,
	readValues,
	commitRow,
}: GridNewRowCellProps<T>) {
	const [draft, setDraft] = useState<unknown>(undefined)

	const update = (next: unknown) => {
		setDraft(next)

		stage(column.id, next)
	}

	const cancel = () => {
		setDraft(undefined)

		unstage(column.id)
	}

	const ariaLabel =
		typeof column.title === 'string' ? `New row ${column.title}` : `New row ${String(column.id)}`

	const error =
		draft !== undefined && column.validate ? column.validate(draft, readValues() as T) : null

	const errorId = `${String(column.id)}-new-row-error`

	const body = column.editCell ? (
		column.editCell({
			row: readValues() as T,
			value: draft,
			onValueUpdate: update,
			// A slot's commit only stages here: a control's pick (a listbox option,
			// a date) must not submit a half-filled entry row.
			commit: (next) => {
				if (next !== undefined) update(next)
			},
			cancel,
			ariaLabel,
			required: column.required ?? false,
		})
	) : (
		<GridEditInputs
			kind={inferEditorKind(column.field != null ? sample?.[column.field] : undefined)}
			draft={draft}
			onValueUpdate={update}
			cancel={cancel}
			ariaLabel={ariaLabel}
			error={error}
			errorId={errorId}
			required={column.required}
			commitRow={commitRow}
			// Escape belongs to the row (clearing the whole entry), so the editor's
			// per-cell revert stands down and the key bubbles to the `<tr>`.
			cancelRow={cancel}
		/>
	)

	return (
		<span className={cn(k.edit.host, error && k.edit.errorRing)}>
			{body}

			{error && (
				<span id={errorId} role="alert" className={cn(k.edit.error)}>
					{error}
				</span>
			)}
		</span>
	)
}

/**
 * The blank entry row (`editable.newRow`): an empty editor in every editable
 * column, at the top or bottom of the body. Enter in one of its text/number
 * editors commits the staged, `validate`-passing values through
 * {@link GridNewRowConfig.onRowAdd} — keyed by column `field`, falling back to
 * id — announces the addition, and reseeds the row blank; Escape discards the
 * entry (deferring to an open floating surface, as the session keys do).
 * Renders whenever the body renders data rows or is empty — a creation flow
 * needs no existing rows — and stands down under grouping.
 *
 * @internal
 */
export function GridNewRow<T>({
	columns,
	sample,
	config,
}: {
	/** The resolved visible columns, structural ones included, so the row's cells align with the body. */
	columns: GridColumn<T>[]
	sample: T | undefined
	config: GridNewRowConfig
}) {
	// The staged entry values, ref-held (no re-render per keystroke); the epoch
	// remounts the cells blank after a commit or discard.
	const valuesRef = useRef<Map<string | number, { field: string; value: unknown }>>(new Map())

	const [epoch, setEpoch] = useState(0)

	const reset = useCallback(() => {
		valuesRef.current = new Map()

		setEpoch((current) => current + 1)
	}, [])

	const stage = useCallback((columnId: string | number, value: unknown, field?: string) => {
		valuesRef.current.set(columnId, { field: field ?? String(columnId), value })
	}, [])

	const readValues = useCallback(() => {
		const values: Record<string, unknown> = {}

		for (const staged of valuesRef.current.values()) values[staged.field] = staged.value

		return values
	}, [])

	const commitRow = useCallback(() => {
		// Drop validate-failing cells (the sink's contract), then hand the built
		// values over; an empty entry commits nothing.
		for (const [columnId, staged] of valuesRef.current) {
			const column = columns.find((candidate) => candidate.id === columnId)

			if (column?.validate?.(staged.value, readValues() as T) != null) {
				valuesRef.current.delete(columnId)
			}
		}

		if (valuesRef.current.size === 0) return

		config.onRowAdd(readValues())

		announce('Row added')

		reset()
	}, [columns, config, readValues, reset])

	// Escape from any entry editor discards the whole entry, deferring to an
	// open floating surface exactly as the session Escape does.
	const onKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>) => {
		if (event.key !== 'Escape' || event.defaultPrevented) return

		if (!(event.target instanceof Element)) return

		if (event.target.closest('[data-floating-ui-portal]')) return

		if (event.target.closest('[aria-expanded="true"]')) return

		event.preventDefault()

		reset()
	}

	return (
		<TableRow data-slot="grid-new-row" onKeyDown={onKeyDown}>
			{columns.map((column) => (
				<TableCell key={`${String(column.id)}:${epoch}`}>
					{isDataColumn(column) && isColumnEditable(column) ? (
						<GridNewRowCell<T>
							column={column}
							sample={sample}
							stage={(columnId, value) =>
								stage(columnId, value, column.field != null ? String(column.field) : undefined)
							}
							unstage={(columnId) => valuesRef.current.delete(columnId)}
							readValues={readValues}
							commitRow={commitRow}
						/>
					) : null}
				</TableCell>
			))}
		</TableRow>
	)
}
