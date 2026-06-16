import type { SyntheticEvent } from 'react'

type Status = 'idle' | 'warning'
type LastEdited = 'password' | 'confirm' | null

/**
 * Resolves the mismatch status from the two field values.
 *
 * @returns `'warning'` only once both fields are non-empty and unequal;
 * `'idle'` otherwise.
 * @remarks
 * While the user is still typing the confirmation (`lastEdited === 'confirm'`
 * and it's shorter than the password) the result stays `'idle'`, so a
 * not-yet-finished entry isn't flagged as a mismatch.
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
 * Ignores events from non-input targets and from the confirmation field (tagged
 * with `data-password-confirm-input`), so only the password field feeds these
 * setters. Marks `'password'` as last edited.
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

	if ('passwordConfirmInput' in target.dataset) return

	setPassword(target.value)
	setPasswordName(target.name || undefined)
	setLastEdited('password')
}
