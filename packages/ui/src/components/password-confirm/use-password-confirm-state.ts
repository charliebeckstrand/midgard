'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { deriveStatus } from './password-confirm-utilities'

type LastEdited = 'password' | 'confirm' | null

type PasswordConfirmStateOptions = {
	/**
	 * Suppresses match/mismatch firing and forces `status` to `'idle'` while set.
	 * Callers use this to hold the confirm warning back when the password field
	 * itself has a higher-priority validation error.
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

	const matchState =
		status === 'warning' ? 'mismatch' : password && confirm && password === confirm ? 'match' : null

	useEffect(() => {
		if (matchState === prevMatchState.current) return

		prevMatchState.current = matchState

		if (matchState === 'match') onMatchRef.current?.()
		else if (matchState === 'mismatch') onMismatchRef.current?.()
	}, [matchState])

	return { password, confirm, status, setPassword, setConfirm, setLastEdited }
}
