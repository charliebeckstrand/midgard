'use client'

import { type KeyboardEvent, useLayoutEffect, useRef } from 'react'
import { Checkbox } from '../../components/checkbox'
import { Input } from '../../components/input'
import { NumberInput } from '../../components/number-input'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid'
import type { EditorKind } from './grid-editing-utilities'

/**
 * Shared props for an internal inline editor: the typed `draft`, the staging and
 * commit/cancel callbacks (from the grid's edit session), and the accessible
 * label. @internal
 */
export type GridEditInputProps = {
	draft: unknown
	onValueUpdate: (next: unknown) => void
	commit: () => void
	cancel: () => void
	ariaLabel: string
}

/** Enter commits, Escape cancels; blur commits separately. @internal */
function editKeyHandler(commit: () => void, cancel: () => void) {
	return (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()

			commit()
		} else if (event.key === 'Escape') {
			event.preventDefault()

			cancel()
		}
	}
}

/** Bare text editor for string cells; cursor lands at the draft's end on mount. @internal */
function GridTextEditInput({
	draft,
	onValueUpdate,
	commit,
	cancel,
	ariaLabel,
}: GridEditInputProps) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		const input = ref.current

		if (!input) return

		input.focus()

		input.setSelectionRange(input.value.length, input.value.length)
	}, [])

	const value = typeof draft === 'string' ? draft : draft == null ? '' : String(draft)

	return (
		<HeadlessProvider>
			<Input
				ref={ref}
				data-slot="grid-edit-input"
				aria-label={ariaLabel}
				className={k.edit.input}
				value={value}
				onChange={(event) => onValueUpdate(event.target.value)}
				onBlur={commit}
				onKeyDown={editKeyHandler(commit, cancel)}
			/>
		</HeadlessProvider>
	)
}

/** Bare number editor for numeric cells; selects on mount so a keystroke replaces. @internal */
function GridNumberEditInput({
	draft,
	onValueUpdate,
	commit,
	cancel,
	ariaLabel,
}: GridEditInputProps) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		const input = ref.current

		if (!input) return

		input.focus()

		input.select()
	}, [])

	return (
		<HeadlessProvider>
			<NumberInput
				ref={ref}
				data-slot="grid-edit-number-input"
				aria-label={ariaLabel}
				className={k.edit.input}
				value={typeof draft === 'number' ? draft : null}
				onValueChange={(next) => onValueUpdate(next ?? undefined)}
				onBlur={commit}
				onKeyDown={editKeyHandler(commit, cancel)}
			/>
		</HeadlessProvider>
	)
}

/** Checkbox editor for boolean cells; a toggle (click or Space) commits the flipped value. @internal */
function GridBooleanEditInput({
	draft,
	onValueUpdate,
	commit,
	cancel,
	ariaLabel,
}: GridEditInputProps) {
	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		ref.current?.focus()
	}, [])

	const checked = draft === true

	return (
		<HeadlessProvider>
			<span className={k.edit.control}>
				<Checkbox
					ref={ref}
					data-slot="grid-edit-boolean-input"
					aria-label={ariaLabel}
					checked={checked}
					// `onValueUpdate` writes the draft synchronously, so the immediate
					// `commit` reads the flipped value.
					onChange={() => {
						onValueUpdate(!checked)

						commit()
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault()

							commit()
						} else if (event.key === 'Escape') {
							event.preventDefault()

							cancel()
						}
					}}
					onBlur={commit}
				/>
			</span>
		</HeadlessProvider>
	)
}

/**
 * Renders the inline editor inferred from the cell value's primitive type — a
 * checkbox for a boolean, a number input for a number, a text input otherwise.
 * The column's {@link GridColumn.editCell} slot supersedes this upstream.
 *
 * @internal
 */
export function GridEditInputs({ kind, ...props }: GridEditInputProps & { kind: EditorKind }) {
	if (kind === 'boolean') return <GridBooleanEditInput {...props} />

	if (kind === 'number') return <GridNumberEditInput {...props} />

	return <GridTextEditInput {...props} />
}
