import type { SyntheticEvent } from 'react'

/** Mismatch status for the confirm coordinator: `warning` only once both fields are non-empty and unequal. @internal */
export type Status = 'idle' | 'warning'

/** Which field the user last edited, gating the still-typing grace period; `null` before either edit. @internal */
export type LastEdited = 'password' | 'confirm' | null

/**
 * Resolves the mismatch status from the two field values.
 *
 * @returns `'warning'` only once both fields are non-empty and unequal;
 * `'idle'` otherwise.
 * @remarks
 * While the user is still typing the confirmation the result stays `'idle'`, so
 * a not-yet-finished entry isn't flagged as a mismatch. That is the case where
 * `lastEdited === 'confirm'` and it is shorter than the password.
 * @internal
 */
export function deriveStatus(password: string, confirm: string, lastEdited: LastEdited): Status {
	if (!password || !confirm) return 'idle'

	if (lastEdited === 'confirm' && confirm.length < password.length) return 'idle'

	if (password === confirm) return 'idle'

	return 'warning'
}

/**
 * Delegated `input` handler for the coordinator: records the password field's
 * value and name from a bubbled event.
 *
 * @remarks
 * Reads only an `<input>` with the `password-input` anchor, which a
 * `PasswordInput` writes. Thus a username field, a checkbox, or the
 * confirmation field (`password-confirm-input`) does not feed these setters.
 * Marks `'password'` as last edited.
 * @internal
 */
export function handlePasswordInput(
	event: SyntheticEvent<HTMLDivElement>,
	setPassword: (value: string) => void,
	setPasswordName: (name: string | undefined) => void,
	setLastEdited: (value: LastEdited) => void,
) {
	const target = event.target

	if (!(target instanceof HTMLInputElement)) return

	if (target.dataset.slot !== 'password-input') return

	setPassword(target.value)
	setPasswordName(target.name || undefined)
	setLastEdited('password')
}

/** The current values of the two fields in a coordinator, as the DOM holds them. @internal */
export type FieldValues = {
	/** The password field, or `undefined` when no field has the anchor. */
	password?: { value: string; name: string | undefined }
	/** The value of the confirmation field, or `undefined` when no field has the anchor. */
	confirm?: string
}

/**
 * Reads the values of the password field and the confirmation field under
 * `root`.
 *
 * @remarks
 * A seeded, controlled, or reset value gets to the DOM with no `input` event.
 * The coordinator reads the fields after each commit, so its state follows
 * such a value.
 * @internal
 */
export function readFieldValues(root: HTMLElement): FieldValues {
	const password = root.querySelector<HTMLInputElement>('input[data-slot="password-input"]')

	const confirm = root.querySelector<HTMLInputElement>('input[data-slot="password-confirm-input"]')

	return {
		password: password ? { value: password.value, name: password.name || undefined } : undefined,
		confirm: confirm?.value,
	}
}
