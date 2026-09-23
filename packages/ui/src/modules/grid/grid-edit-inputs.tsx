'use client'

import type { KeyboardEvent } from 'react'
import { Input } from '../../components/input'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { NumberInput } from '../../components/number-input'
import { k } from '../../recipes/kata/grid'
import type { EditorKind } from './engine/grid-editing-utilities'

/**
 * Shared props for an internal inline editor: the typed `draft`, the staging and
 * cancel callbacks, and the accessible label. None of these grabs focus on
 * mount. Under row scope a whole row's editors mount at once, and the user
 * clicks or tabs into the cell to edit it. A cell-scoped session mounts the one
 * editor it entered and focuses it from the editing layer, not from here.
 *
 * @internal
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
	 * Whether the grid owns the edit session (`trigger: 'doubleClick'`). A
	 * grid-owned session handles its keys on the grid table's key surface, so the
	 * editor lets Enter and Escape bubble past it. Under a consumer-owned session
	 * the editor keeps Escape, which reverts this cell, and nothing saves on Enter.
	 */
	sessionOwned: boolean
}

/**
 * Escape reverts the cell under a consumer-owned session. A grid-owned session
 * handles its keys once on the grid `<table>`'s key surface (see
 * `useGridEditing`'s `sessionKeys`). Every editor therefore inherits them: these
 * inferred inputs, the listbox, and an `editCell` slot. The keys bubble past the
 * editor here. Staging is live, so there is no per-cell commit key.
 *
 * @internal
 */
const editorKeys =
	({ cancel, sessionOwned }: Pick<GridEditInputProps, 'cancel' | 'sessionOwned'>) =>
	(event: KeyboardEvent<HTMLElement>) => {
		if (event.key !== 'Escape' || sessionOwned) return

		event.preventDefault()

		cancel()
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
	sessionOwned,
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
			onKeyDown={editorKeys({ cancel, sessionOwned })}
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
	sessionOwned,
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
			onKeyDown={editorKeys({ cancel, sessionOwned })}
		/>
	)
}

const BOOLEAN_OPTIONS = [
	{ value: 'true', label: 'Yes' },
	{ value: 'false', label: 'No' },
]

/**
 * Boolean editor for true/false cells, a yes/no `Listbox`. The commit key stays
 * off it, because Enter belongs to the listbox's own open/select interaction.
 * The grid table's key surface leaves Enter on a button to that button, so the
 * trigger keeps it. A grid-owned session therefore saves from a sibling
 * text/number editor, or the consumer's save affordance. Under `scope: 'cell'`
 * there is no sibling, because the session mounts this editor alone. The cell's
 * own save control is then the keyboard commit this editor cannot otherwise
 * have (WCAG 2.1.1). Escape reaches this editor the way it reaches every other,
 * through the grid table's key surface. That surface defers to the listbox's
 * own panel while it is open.
 * @internal
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
 * Renders the inline editor inferred from the cell value's primitive type. That
 * is a yes/no listbox for a boolean, a number input for a number, and a text
 * input otherwise. The column's {@link GridColumn.editCell} slot supersedes this
 * upstream.
 *
 * @internal
 */
export function GridEditInputs({ kind, ...props }: GridEditInputProps & { kind: EditorKind }) {
	if (kind === 'boolean') return <GridBooleanEditInput {...props} />

	if (kind === 'number') return <GridNumberEditInput {...props} />

	return <GridTextEditInput {...props} />
}
