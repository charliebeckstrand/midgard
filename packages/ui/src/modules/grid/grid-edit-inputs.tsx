'use client'

import type { KeyboardEvent } from 'react'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { NumberInput } from '../../components/number-input'
import { k } from '../../recipes/kata/grid'
import type { EditorKind } from './grid-editing-utilities'

/**
 * Shared props for an internal inline editor: the typed `draft`, the staging and
 * cancel callbacks, and the accessible label. The whole editable row mounts its
 * editors at once, so none of them grabs focus on mount — the user clicks or tabs
 * into the cell to edit it. @internal
 */
export type GridEditInputProps = {
	draft: unknown
	onValueUpdate: (next: unknown) => void
	/** Revert this cell to the row's current value (Escape). */
	cancel: () => void
	ariaLabel: string
	/** The cell's current validation error, if any: marks the editor invalid. */
	error?: string | null
	/** Id of the error-message element, linked from the editor via `aria-describedby`. */
	errorId?: string
}

/** Escape reverts the cell; staging is live, so there is no commit key. @internal */
const cancelOnEscape = (cancel: () => void) => (event: KeyboardEvent<HTMLElement>) => {
	if (event.key === 'Escape') {
		event.preventDefault()

		cancel()
	}
}

/** Text editor for string cells, backed by the `Input` component. @internal */
function GridTextEditInput({
	draft,
	onValueUpdate,
	cancel,
	ariaLabel,
	error,
	errorId,
}: GridEditInputProps) {
	const value = typeof draft === 'string' ? draft : draft == null ? '' : String(draft)

	return (
		<Input
			data-slot="grid-edit-input"
			aria-label={ariaLabel}
			invalid={error != null || undefined}
			aria-describedby={error != null ? errorId : undefined}
			className={k.edit.input}
			value={value}
			onChange={(event) => onValueUpdate(event.target.value)}
			onKeyDown={cancelOnEscape(cancel)}
		/>
	)
}

/** Number editor for numeric cells, backed by `NumberInput`. @internal */
function GridNumberEditInput({
	draft,
	onValueUpdate,
	cancel,
	ariaLabel,
	error,
	errorId,
}: GridEditInputProps) {
	return (
		<NumberInput
			data-slot="grid-edit-number-input"
			aria-label={ariaLabel}
			invalid={error != null || undefined}
			aria-describedby={error != null ? errorId : undefined}
			className={k.edit.input}
			value={typeof draft === 'number' ? draft : null}
			onValueChange={(next) => onValueUpdate(next ?? undefined)}
			onKeyDown={cancelOnEscape(cancel)}
		/>
	)
}

const BOOLEAN_OPTIONS = [
	{ value: 'true', label: 'Yes' },
	{ value: 'false', label: 'No' },
]

/** Boolean editor for true/false cells, a yes/no `Listbox`. @internal */
function GridBooleanEditInput({ draft, onValueUpdate, ariaLabel }: GridEditInputProps) {
	return (
		<Listbox<string>
			data-slot="grid-edit-boolean-input"
			aria-label={ariaLabel}
			className={k.edit.input}
			value={draft === true ? 'true' : 'false'}
			onValueChange={(next) => onValueUpdate(next === 'true')}
			displayValue={(value) => (value === 'true' ? 'Yes' : 'No')}
		>
			{BOOLEAN_OPTIONS.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}

/**
 * Renders the inline editor inferred from the cell value's primitive type — a
 * yes/no listbox for a boolean, a number input for a number, a text input
 * otherwise. The column's {@link GridColumn.editCell} slot supersedes this
 * upstream.
 *
 * @internal
 */
export function GridEditInputs({ kind, ...props }: GridEditInputProps & { kind: EditorKind }) {
	if (kind === 'boolean') return <GridBooleanEditInput {...props} />

	if (kind === 'number') return <GridNumberEditInput {...props} />

	return <GridTextEditInput {...props} />
}
