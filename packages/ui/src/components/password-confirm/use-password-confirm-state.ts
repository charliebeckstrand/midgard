'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { deriveStatus, type LastEdited, type Status } from './password-confirm-utilities'

type PasswordConfirmStateOptions = {
	/**
	 * Suppresses match/mismatch firing and forces `status` to `'idle'` while set.
	 * Pass when the password field itself has a higher-priority validation error.
	 * @defaultValue `false`
	 */
	disabled?: boolean
	onMatchChange?: (matched: boolean) => void
}

type PasswordConfirmStateResult = {
	password: string
	confirm: string
	status: Status
	setPassword: (value: string) => void
	setConfirm: (value: string) => void
	setLastEdited: (which: LastEdited) => void
}

/**
 * Tracks password/confirm values and derives match status for the coordinator.
 *
 * @returns The current `password` and `confirm` values, the derived `status`,
 * and the setters `setPassword`, `setConfirm`, and `setLastEdited`. The value
 * setters record a value from any source. Only a user edit calls
 * `setLastEdited`, so a reset or a seeded value does not start the grace
 * period.
 * @remarks
 * `onMatchChange(matched)` fires from an effect on transitions only, so a
 * match→match repeat won't re-fire. The effect calls it through
 * `useEffectEvent`, so a changed callback identity doesn't retrigger. When a
 * match ends because a field becomes empty or the confirmation becomes
 * partial, it fires `false`, so no stale `true` stays. `disabled` suppresses
 * each report, not mismatch alone, and keeps the last reported value.
 * @internal
 */
export function usePasswordConfirmState({
	disabled = false,
	onMatchChange,
}: PasswordConfirmStateOptions = {}): PasswordConfirmStateResult {
	const [password, setPassword] = useState('')

	const [confirm, setConfirm] = useState('')

	const [lastEdited, setLastEdited] = useState<LastEdited>(null)

	const status: Status = disabled ? 'idle' : deriveStatus(password, confirm, lastEdited)

	const reportMatch = useEffectEvent((matched: boolean) => onMatchChange?.(matched))

	// The last value given to `onMatchChange`, or `null` before the first report.
	const lastReported = useRef<boolean | null>(null)

	const matchState =
		status === 'warning'
			? 'mismatch'
			: !disabled && password && confirm && password === confirm
				? 'match'
				: null

	useEffect(() => {
		// `disabled` suppresses each report, and the tracker keeps its value. A
		// match while disabled thus cannot swallow the real match after re-enable.
		if (disabled) return

		// A mismatch reports `false`. The indeterminate `null` state (a field
		// cleared, or a partial confirmation) reports `false` only when it ends a
		// match, so that the consumer does not keep a stale `true`.
		if (matchState === null && lastReported.current !== true) return

		const matched = matchState === 'match'

		if (matched === lastReported.current) return

		lastReported.current = matched

		reportMatch(matched)
	}, [matchState, disabled])

	return { password, confirm, status, setPassword, setConfirm, setLastEdited }
}
