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
	/** Marks the editor `aria-required` (the programmatic cue; enforcement stays with `validate`). */
	required?: boolean
	/** Saves the row's edit session (Enter) when the grid owns it (`trigger: 'doubleClick'`); absent under a consumer-owned session. */
	commitRow?: () => void
	/**
	 * Present when the grid owns the row's edit session: Escape then belongs to
	 * the grid table's key surface, which abandons the whole row, so the editor's
	 * per-cell revert stands down and the key bubbles. Absent under a
	 * consumer-owned session, where Escape reverts this cell.
	 */
	cancelRow?: () => void
}

/**
 * Enter saves the row when the grid owns the session (`trigger:
 * 'doubleClick'`); Escape reverts the cell under a consumer-owned session. A
 * grid-owned session's Escape abandons the whole row instead, handled once on
 * the grid `<table>`'s key surface (see `useGridEditing`'s `sessionEscape`) so
 * every editor — these inferred inputs, the listbox, an `editCell` slot —
 * inherits it; the key bubbles past the editor here. Staging is live, so there
 * is no per-cell commit key. @internal
 */
const editorKeys =
	({
		cancel,
		commitRow,
		cancelRow,
	}: Pick<GridEditInputProps, 'cancel' | 'commitRow' | 'cancelRow'>) =>
	(event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Escape' && !cancelRow) {
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
	cancelRow,
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
			onKeyDown={editorKeys({ cancel, commitRow, cancelRow })}
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
	cancelRow,
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
			onKeyDown={editorKeys({ cancel, commitRow, cancelRow })}
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
 * save affordance. Escape still abandons the session through the grid table's
 * key surface (deferring to the open panel), like every editor. @internal
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
