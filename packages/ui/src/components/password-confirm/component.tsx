'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { Text } from '../text'
import { PasswordConfirmProvider, usePasswordConfirm } from './context'
import { deriveStatus, handlePasswordInput } from './utilities'

export type PasswordConfirmProps = {
	valid?: React.ReactNode
	warning?: React.ReactNode
	className?: string
	children?: React.ReactNode
	onPasswordMatch?: () => void
	onPasswordMismatch?: () => void
}

export function PasswordConfirm({
	onPasswordMatch,
	onPasswordMismatch,
	valid,
	warning,
	className,
	children,
}: PasswordConfirmProps) {
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')

	const status = deriveStatus(password, confirm)

	const onMatchRef = useRef(onPasswordMatch)
	const onMismatchRef = useRef(onPasswordMismatch)

	onMatchRef.current = onPasswordMatch
	onMismatchRef.current = onPasswordMismatch

	const prevMatchState = useRef<'match' | 'mismatch' | null>(null)

	const matchState = status === 'valid' ? 'match' : status === 'warning' ? 'mismatch' : null

	useEffect(() => {
		if (matchState === prevMatchState.current) return

		prevMatchState.current = matchState

		if (matchState === 'match') onMatchRef.current?.()
		else if (matchState === 'mismatch') onMismatchRef.current?.()
	}, [matchState])

	const handleInput = useCallback(
		(e: React.SyntheticEvent<HTMLDivElement>) => handlePasswordInput(e, setPassword),
		[],
	)

	return (
		<PasswordConfirmProvider value={{ status, setConfirm }}>
			<div data-slot="password-confirm" className={className} onInput={handleInput}>
				{children}
				{(status === 'warning' || status === 'valid') && (
					<div aria-live="polite" aria-atomic="true">
						{status === 'warning' && warning && (
							<Text color="amber" className="text-sm">
								{warning}
							</Text>
						)}
						{status === 'valid' && valid && (
							<Text color="green" className="text-sm">
								{valid}
							</Text>
						)}
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
	const { status, setConfirm } = usePasswordConfirm()

	return (
		<PasswordInput
			data-password-confirm-input
			{...(status === 'valid' ? { 'data-valid': true } : {})}
			{...(status === 'warning' ? { 'data-warning': true } : {})}
			{...props}
			onChange={(e) => {
				setConfirm(e.target.value)

				onChange?.(e)
			}}
		/>
	)
}
