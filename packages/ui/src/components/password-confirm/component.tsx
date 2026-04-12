'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PasswordInput, type PasswordInputProps } from '../input'
import { Text } from '../text'
import { PasswordConfirmProvider, usePasswordConfirm } from './context'

type Status = 'idle' | 'valid' | 'warning'

type PasswordConfirmEvents = {
	onPasswordMatch?: () => void
	onPasswordMismatch?: () => void
}

type PasswordConfirmProps = {
	valid?: React.ReactNode
	warning?: React.ReactNode
	className?: string
	children?: React.ReactNode
}

export type Props = PasswordConfirmProps & PasswordConfirmEvents

function deriveStatus(password: string, confirm: string): Status {
	if (!password || !confirm || confirm.length < password.length) return 'idle'

	if (password === confirm) return 'valid'

	return 'warning'
}

export function PasswordConfirm({
	onPasswordMatch,
	onPasswordMismatch,
	valid,
	warning,
	className,
	children,
}: Props) {
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')

	const status = deriveStatus(password, confirm)

	const onMatchRef = useRef(onPasswordMatch)
	const onMismatchRef = useRef(onPasswordMismatch)

	onMatchRef.current = onPasswordMatch
	onMismatchRef.current = onPasswordMismatch

	const prevMatchState = useRef<'match' | 'mismatch' | null>(null)

	useEffect(() => {
		const current = status === 'valid' ? 'match' : status === 'warning' ? 'mismatch' : null

		if (current === prevMatchState.current) return

		prevMatchState.current = current

		if (current === 'match') onMatchRef.current?.()
		else if (current === 'mismatch') onMismatchRef.current?.()
	}, [status])

	const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
		const target = e.target

		if (!(target instanceof HTMLInputElement)) return

		if ('passwordConfirmInput' in target.dataset) return

		setPassword(target.value)
	}, [])

	return (
		<PasswordConfirmProvider value={{ status, setConfirm }}>
			<div data-slot="password-confirm" className={className} onInput={handleInput}>
				{children}
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
		</PasswordConfirmProvider>
	)
}

export type PasswordConfirmInputProps = PasswordInputProps

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
