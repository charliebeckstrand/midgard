'use client'

import { useLayoutEffect, useRef } from 'react'
import { DateInput, type DateInputFormat } from '../../components/date-input'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid-editable'
import { editorKeyHandler } from './grid-editable-editor-utilities'
import type { GridEditableEditorProps } from './grid-editable-types'

/**
 * Parses an ISO `YYYY-MM-DD` string into a local `Date` (midnight local time),
 * or `undefined` when the string isn't a calendar date. Local construction
 * avoids the day-shift `new Date('2026-01-15')` causes by parsing as UTC.
 *
 * @internal
 */
export function isoToDate(iso: string): Date | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)

	if (!match) return undefined

	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Formats a `Date` as an ISO `YYYY-MM-DD` string in local time. @internal */
export function dateToIso(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Props for {@link GridEditableDateEditor}: the {@link GridEditableEditorProps}
 * edit-slot contract plus optional `min`/`max` bounds and the typed `format`.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditableDateEditorProps<T> = GridEditableEditorProps<T> & {
	min?: Date
	max?: Date
	/**
	 * Mask the typed entry uses. Defaults to ISO to match the column's stored
	 * `YYYY-MM-DD` value.
	 * @defaultValue 'YYYY-MM-DD'
	 */
	format?: DateInputFormat
}

/**
 * In-cell date editor backed by `DateInput` — a typed, masked text input (no
 * calendar popover), so it commits on Enter / Tab / blur like the other inline
 * editors. Seeds from the row's current ISO `YYYY-MM-DD` value (`column.field`),
 * masks entry in `format` (ISO by default), and writes the value back as ISO;
 * Escape cancels. Pair the column's `value` accessor with an ISO string so sort
 * and filter read the same value the editor writes.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export function GridEditableDateEditor<T>({
	row,
	column,
	commit,
	cancel,
	setDraft,
	align,
	ariaLabel,
	min,
	max,
	format = 'YYYY-MM-DD',
}: GridEditableDateEditorProps<T>) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		const input = ref.current

		if (!input) return

		input.focus()

		input.select()
	}, [])

	const fieldValue = column.field ? row[column.field] : undefined

	const initial = typeof fieldValue === 'string' ? isoToDate(fieldValue) : undefined

	return (
		<HeadlessProvider>
			<span className={k.editControl({ align })}>
				<DateInput
					ref={ref}
					data-slot="grid-editable-date-input"
					aria-label={ariaLabel}
					format={format}
					defaultValue={initial}
					min={min}
					max={max}
					clearable={false}
					// Mirror the parsed date into the draft as ISO; the commit reads it.
					onValueChange={(date) => setDraft(date ? dateToIso(date) : '')}
					onBlur={() => commit('none')}
					onKeyDown={editorKeyHandler(commit, cancel)}
				/>
			</span>
		</HeadlessProvider>
	)
}
