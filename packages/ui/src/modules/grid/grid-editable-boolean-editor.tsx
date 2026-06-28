'use client'

import { type KeyboardEvent, useLayoutEffect, useRef } from 'react'
import { Checkbox } from '../../components/checkbox'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid-editable'
import type { GridEditableEditorProps } from './grid-editable-types'

/**
 * In-cell boolean editor backed by `Checkbox`. Reflects the row field's current
 * truth, focuses on mount, and toggles — committing the flipped value and
 * advancing the cursor down — on click or Space; Enter commits the current value
 * and Escape cancels. Pair with a boolean `parse` on the column (e.g.
 * `parse: (raw) => raw === 'true'`) to round-trip the value as a boolean.
 *
 * @remarks Consumes the shared {@link GridEditableEditorProps}; a boolean cell
 * needs no editor-specific options, so it exports no dedicated props type (unlike
 * the number, currency, date, and select editors).
 * @typeParam T - The row type backing the cell under edit.
 */
export function GridEditableBooleanEditor<T>({
	row,
	column,
	draft,
	setDraft,
	commit,
	cancel,
	align,
	ariaLabel,
}: GridEditableEditorProps<T>) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		ref.current?.focus()
	}, [])

	// Prefer the live field value; fall back to the draft for a field-less column.
	const fieldValue = column.field ? row[column.field] : undefined

	const checked = typeof fieldValue === 'boolean' ? fieldValue : draft === 'true'

	// A toggle (pointer or Space) writes the flipped value and advances; the
	// commit reads the draft synchronously, so set-then-commit is safe.
	const toggle = () => {
		setDraft(String(!checked))

		commit('down')
	}

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()

			commit('down')
		} else if (event.key === 'Escape') {
			event.preventDefault()

			cancel()
		}
	}

	return (
		<HeadlessProvider>
			<span className={k.editControl({ align })}>
				<Checkbox
					ref={ref}
					data-slot="grid-editable-boolean-input"
					aria-label={ariaLabel}
					checked={checked}
					onChange={toggle}
					onKeyDown={onKeyDown}
					onBlur={() => commit('none')}
				/>
			</span>
		</HeadlessProvider>
	)
}
