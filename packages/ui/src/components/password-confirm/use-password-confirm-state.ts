'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { deriveStatus } from './password-confirm-utilities'

type LastEdited = 'password' | 'confirm' | null

type PasswordConfirmStateOptions = {
	/**
	 * Suppresses match/mismatch firing and forces `status` to `'idle'` while set.
	 * Pass when the password field itself has a higher-priority validation error.
	 * @defaultValue `false`
	 */
	disabled?: boolean
	onPasswordMatch?: () => void
	onPasswordMismatch?: () => void
}

type PasswordConfirmStateResult = {
	password: string
	confirm: string
	status: 'idle' | 'warning'
	setPassword: (value: string) => void
	setConfirm: (value: string) => void
	setLastEdited: (which: LastEdited) => void
}

/**
 * Tracks password/confirm values and derives match status for the coordinator.
 *
 * @returns The current `password` and `confirm` values, the derived `status`,
 * and the setters `setPassword`, `setConfirm` (which also marks confirm as last
 * edited), and `setLastEdited`.
 * @remarks
 * `onPasswordMatch`/`onPasswordMismatch` fire from an effect on transitions
 * only (a match→match repeat won't re-fire), read through refs so a changed
 * callback identity doesn't retrigger. `disabled` suppresses both the `'match'`
 * and `'mismatch'` transitions — not mismatch alone — so a match fired while
 * disabled can't pin the transition tracker and swallow the real match after
 * re-enable.
 * @internal
 */
export function usePasswordConfirmState({
	disabled = false,
	onPasswordMatch,
	onPasswordMismatch,
}: PasswordConfirmStateOptions = {}): PasswordConfirmStateResult {
	const [password, setPassword] = useState('')

	const [confirm, setConfirmState] = useState('')

	const [lastEdited, setLastEdited] = useState<LastEdited>(null)

	const setConfirm = useCallback((value: string) => {
		setConfirmState(value)
		setLastEdited('confirm')
	}, [])

	const status: 'idle' | 'warning' = disabled ? 'idle' : deriveStatus(password, confirm, lastEdited)

	const onMatchRef = useRef(onPasswordMatch)
	const onMismatchRef = useRef(onPasswordMismatch)

	onMatchRef.current = onPasswordMatch
	onMismatchRef.current = onPasswordMismatch

	const prevMatchState = useRef<'match' | 'mismatch' | null>(null)

	// `disabled` suppresses match firing too, not mismatch alone (which `status`
	// already gates to idle). A match fired while disabled pins prevMatchState
	// to 'match', swallowing the legitimate match after re-enable.
	const matchState =
		status === 'warning'
			? 'mismatch'
			: !disabled && password && confirm && password === confirm
				? 'match'
				: null

	useEffect(() => {
		if (matchState === prevMatchState.current) return

		prevMatchState.current = matchState

		if (matchState === 'match') onMatchRef.current?.()
		else if (matchState === 'mismatch') onMismatchRef.current?.()
	}, [matchState])

	return { password, confirm, status, setPassword, setConfirm, setLastEdited }
}
