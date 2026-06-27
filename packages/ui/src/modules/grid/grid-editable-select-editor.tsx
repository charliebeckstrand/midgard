'use client'

import { useRef, useState } from 'react'
import { Select, SelectLabel, SelectOption } from '../../components/select'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid-editable'
import type { GridEditableEditorProps } from './grid-editable-types'

/**
 * Props for {@link GridEditableSelectEditor}: the {@link GridEditableEditorProps}
 * edit-slot contract plus the `options` to choose from.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditableSelectEditorProps<T> = GridEditableEditorProps<T> & {
	/** Selectable options; each `value` is the committed string. */
	options: { label: string; value: string }[]
}

/**
 * In-cell single-select editor backed by `Select`. Opens its dropdown on mount,
 * preselects the row's current value (from `column.field`, else the draft), and
 * commits the picked option — advancing the cursor down — on choice; dismissing
 * without a pick cancels. Pair with a `value` accessor on the column so sort and
 * filter read the same value the editor writes.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export function GridEditableSelectEditor<T>({
	row,
	column,
	draft,
	setDraft,
	commit,
	cancel,
	align,
	ariaLabel,
	options,
}: GridEditableSelectEditorProps<T>) {
	const [open, setOpen] = useState(true)

	// Once a value is picked the cell commits and unmounts; the guard keeps a
	// trailing close from also firing a cancel.
	const committed = useRef(false)

	const fieldValue = column.field ? row[column.field] : undefined

	const current = fieldValue != null ? String(fieldValue) : draft || undefined

	return (
		<HeadlessProvider>
			<span className={k.editControl({ align })}>
				<Select<string>
					open={open}
					onOpenChange={(next) => {
						setOpen(next)

						// Dismissed without choosing: keep the cell's value.
						if (!next && !committed.current) cancel()
					}}
					value={current}
					onValueChange={(value) => {
						if (value == null) return

						committed.current = true

						setDraft(value)

						commit('down')
					}}
					displayValue={(value) => options.find((option) => option.value === value)?.label ?? value}
					aria-label={ariaLabel}
				>
					{options.map((option) => (
						<SelectOption key={option.value} value={option.value}>
							<SelectLabel>{option.label}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</span>
		</HeadlessProvider>
	)
}
