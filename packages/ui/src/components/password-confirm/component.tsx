'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext } from '../form/context'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { Text } from '../text'
import { PasswordConfirmProvider, usePasswordConfirm } from './context'
import { deriveStatus, handlePasswordInput } from './utilities'

export type PasswordConfirmProps = {
	warning?: React.ReactNode
	className?: string
	children?: React.ReactNode
	onPasswordMatch?: () => void
	onPasswordMismatch?: () => void
}

export function PasswordConfirm({
	onPasswordMatch,
	onPasswordMismatch,
	warning,
	className,
	children,
}: PasswordConfirmProps) {
	const [password, setPassword] = useState('')
	const [passwordName, setPasswordName] = useState<string | undefined>(undefined)

	const [confirm, setConfirm] = useState('')
	const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

	const [lastEdited, setLastEdited] = useState<'password' | 'confirm' | null>(null)

	const form = useFormContext()

	const passwordError = passwordName ? form?.errors[passwordName] : undefined
	const confirmHasFormError = confirmName ? Boolean(form?.errors[confirmName]) : false

	const handleSetConfirm = useCallback((value: string) => {
		setConfirm(value)
		setLastEdited('confirm')
	}, [])

	const status = passwordError ? 'idle' : deriveStatus(password, confirm, lastEdited)

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

	const handleInput = useCallback(
		(e: React.SyntheticEvent<HTMLDivElement>) =>
			handlePasswordInput(e, setPassword, setPasswordName, setLastEdited),
		[],
	)

	return (
		<PasswordConfirmProvider
			value={{ status, setConfirm: handleSetConfirm, setConfirmName, confirmHasFormError }}
		>
			<div data-slot="password-confirm" className={className} onInput={handleInput}>
				{children}
				{status === 'warning' && warning && !confirmHasFormError && (
					<div aria-live="polite" aria-atomic="true">
						<Text color="amber">{warning}</Text>
					</div>
				)}
			</div>
		</PasswordConfirmProvider>
	)
}

export type PasswordConfirmInputProps = Omit<PasswordInputProps, 'onChange'> & {
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function PasswordConfirmInput({ onChange, ...props }: PasswordConfirmInputProps) {
	const { status, setConfirm, setConfirmName, confirmHasFormError } = usePasswordConfirm()

	useEffect(() => {
		setConfirmName(props.name)
	}, [props.name, setConfirmName])

	const showWarning = status === 'warning' && !confirmHasFormError

	return (
		<PasswordInput
			data-password-confirm-input
			{...(showWarning ? { 'data-warning': true } : {})}
			{...props}
			onChange={(e) => {
				setConfirm(e.target.value)

				onChange?.(e)
			}}
		/>
	)
}
