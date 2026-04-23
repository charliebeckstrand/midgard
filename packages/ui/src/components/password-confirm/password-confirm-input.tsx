'use client'

import { type ChangeEvent, useEffect } from 'react'
import { PasswordInput, type PasswordInputProps } from '../password-input'
import { usePasswordConfirm } from './context'

export type PasswordConfirmInputProps = Omit<PasswordInputProps, 'onChange'> & {
	onChange?: (e: ChangeEvent<HTMLInputElement>) => void
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
