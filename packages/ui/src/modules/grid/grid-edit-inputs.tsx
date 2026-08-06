'use client'

import type { KeyboardEvent } from 'react'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { NumberInput } from '../../components/number-input'
import { k } from '../../recipes/kata/grid'
import type { EditorKind } from './engine/grid-editing-utilities'

/**
 * Shared props for an internal inline editor: the typed `draft`, the staging and
 * cancel callbacks, and the accessible label. None of these grabs focus on mount:
 * under row scope a whole row's editors mount at once, and the user clicks or
 * tabs into the cell to edit it. A cell-scoped session mounts the one editor it
 * entered and focuses it from the editing layer, not from here. @internal
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
	/** Marks the editor `aria-required` (the programmatic cue; enforcement stays with `validate`). */
	required?: boolean
	/**
	 * Saves the edit session (Enter), present exactly when the grid owns it
	 * (`trigger: 'doubleClick'`). Its presence is also what stands the editor's own
	 * Escape down. A grid-owned session abandons on the grid table's key surface,
	 * which drops what the session owns: the whole row, or the active cell under
	 * `scope: 'cell'`. The key therefore bubbles past this editor. Absent under a
	 * consumer-owned session, where Escape reverts this cell and nothing saves it.
	 */
	commitRow?: () => void
}

/**
 * Enter saves the session when the grid owns it (`trigger: 'doubleClick'`);
 * Escape reverts the cell under a consumer-owned session. A grid-owned session's
 * Escape abandons the session instead. That press is handled once on the grid
 * `<table>`'s key surface (see `useGridEditing`'s `sessionEscape`), so every
 * editor inherits it: these inferred inputs, the listbox, an `editCell` slot.
 * The key therefore bubbles past the editor here. Staging is live, so there is
 * no per-cell commit key. @internal
 */
const editorKeys =
	({ cancel, commitRow }: Pick<GridEditInputProps, 'cancel' | 'commitRow'>) =>
	(event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Escape' && !commitRow) {
			event.preventDefault()

			cancel()
		} else if (event.key === 'Enter' && commitRow) {
			event.preventDefault()

			commitRow()
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
	required,
	commitRow,
}: GridEditInputProps) {
	const value = typeof draft === 'string' ? draft : draft == null ? '' : String(draft)

	return (
		<Input
			data-slot="grid-edit-input"
			aria-label={ariaLabel}
			aria-required={required || undefined}
			invalid={error != null || undefined}
			aria-describedby={error != null ? errorId : undefined}
			className={k.edit.input}
			value={value}
			onChange={(event) => onValueUpdate(event.target.value)}
			onKeyDown={editorKeys({ cancel, commitRow })}
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
	required,
	commitRow,
}: GridEditInputProps) {
	return (
		<NumberInput
			data-slot="grid-edit-number-input"
			aria-label={ariaLabel}
			aria-required={required || undefined}
			invalid={error != null || undefined}
			aria-describedby={error != null ? errorId : undefined}
			className={k.edit.input}
			value={typeof draft === 'number' ? draft : null}
			onValueChange={(next) => onValueUpdate(next ?? undefined)}
			onKeyDown={editorKeys({ cancel, commitRow })}
		/>
	)
}

const BOOLEAN_OPTIONS = [
	{ value: 'true', label: 'Yes' },
	{ value: 'false', label: 'No' },
]

/**
 * Boolean editor for true/false cells, a yes/no `Listbox`. The commit key stays
 * off it — Enter belongs to the listbox's own open/select interaction — so a
 * grid-owned session saves from a sibling text/number editor or the consumer's
 * save affordance. Under `scope: 'cell'` there is no sibling, because the
 * session mounts this editor alone: the value commits when the session moves to
 * another cell, or through the consumer's own save. Escape reaches this editor
 * the way it reaches every other, through the grid table's key surface. That
 * surface defers to the listbox's own panel while it is open. @internal
 */
function GridBooleanEditInput({ draft, onValueUpdate, ariaLabel, required }: GridEditInputProps) {
	return (
		<Listbox<string>
			data-slot="grid-edit-boolean-input"
			aria-label={ariaLabel}
			aria-required={required || undefined}
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
