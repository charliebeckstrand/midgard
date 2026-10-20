/** Mismatch status for the confirm coordinator: `warning` only once both fields are non-empty and unequal. @internal */
export type Status = 'idle' | 'warning'

/** The field a part reports for: the password, or its confirmation. @internal */
export type PasswordConfirmRole = 'password' | 'confirm'

/**
 * Resolves the mismatch status from the two field values.
 *
 * @returns `'warning'` only once both fields are non-empty and unequal;
 * `'idle'` otherwise.
 * @remarks
 * While the user is still typing the confirmation the result stays `'idle'`, so
 * a not-yet-finished entry isn't flagged as a mismatch. That is the case where
 * `lastEdited === 'confirm'` and it is shorter than the password. `lastEdited`
 * is `null` before either edit.
 * @internal
 */
export function deriveStatus(
	password: string,
	confirm: string,
	lastEdited: PasswordConfirmRole | null,
): Status {
	if (!password || !confirm) return 'idle'

	if (lastEdited === 'confirm' && confirm.length < password.length) return 'idle'

	if (password === confirm) return 'idle'

	return 'warning'
}

/**
 * Converts an input value to the text that the coordinator compares.
 *
 * @returns An empty string for `null` or `undefined`, else the value as a string.
 * @internal
 */
export function toFieldText(value: unknown): string {
	return value == null ? '' : String(value)
}
