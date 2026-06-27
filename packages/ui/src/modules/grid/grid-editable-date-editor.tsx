'use client'

import type { KeyboardEvent } from 'react'
import { DatePicker } from '../../components/date-picker'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid-editable'
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
 * edit-slot contract plus optional `min`/`max` calendar bounds.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditableDateEditorProps<T> = GridEditableEditorProps<T> & {
	min?: Date
	max?: Date
}

/**
 * In-cell date editor backed by `DatePicker` in typed-input mode. Seeds from the
 * row's current ISO `YYYY-MM-DD` value (`column.field`) and commits the picked or
 * typed date — written back as ISO and advancing the cursor down — on change;
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
}: GridEditableDateEditorProps<T>) {
	const fieldValue = column.field ? row[column.field] : undefined

	const initial = typeof fieldValue === 'string' ? isoToDate(fieldValue) : undefined

	const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
		if (event.key === 'Escape') {
			event.preventDefault()

			cancel()
		}
	}

	return (
		<HeadlessProvider>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a keydown listener on the host span routes Escape to cancel; the DatePicker input owns the real focus */}
			<span className={k.editControl({ align })} onKeyDown={onKeyDown}>
				<DatePicker
					input
					aria-label={ariaLabel}
					defaultValue={initial}
					min={min}
					max={max}
					onValueChange={(date) => {
						setDraft(date ? dateToIso(date) : '')

						commit('down')
					}}
				/>
			</span>
		</HeadlessProvider>
	)
}
