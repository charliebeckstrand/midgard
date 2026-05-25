'use client'

import { type ReactNode, type SyntheticEvent, useCallback, useMemo, useState } from 'react'
import { useFormContext } from '../form/context'
import { Text } from '../text'
import { PasswordConfirmContext } from './context'
import { handlePasswordInput } from './password-confirm-utilities'
import { usePasswordConfirmState } from './use-password-confirm-state'

export type PasswordConfirmProps = {
	warning?: ReactNode
	className?: string
	children?: ReactNode
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
	const [passwordName, setPasswordName] = useState<string | undefined>(undefined)
	const [confirmName, setConfirmName] = useState<string | undefined>(undefined)

	const form = useFormContext()

	const passwordError = passwordName ? form?.errors[passwordName] : undefined

	const confirmHasFormError = confirmName ? Boolean(form?.errors[confirmName]) : false

	const { status, setPassword, setConfirm, setLastEdited } = usePasswordConfirmState({
		disabled: Boolean(passwordError),
		onPasswordMatch,
		onPasswordMismatch,
	})

	const handleInput = useCallback(
		(e: SyntheticEvent<HTMLDivElement>) =>
			handlePasswordInput(e, setPassword, setPasswordName, setLastEdited),
		[setPassword, setLastEdited],
	)

	const context = useMemo(
		() => ({ status, setConfirm, setConfirmName, confirmHasFormError }),
		[status, setConfirm, confirmHasFormError],
	)

	return (
		<PasswordConfirmContext value={context}>
			<div data-slot="password-confirm" className={className} onInput={handleInput}>
				<div className="space-y-4">{children}</div>
				{status === 'warning' && warning && !confirmHasFormError && (
					<div aria-live="polite" aria-atomic="true" className="pt-2">
						<Text color="amber">{warning}</Text>
					</div>
				)}
			</div>
		</PasswordConfirmContext>
	)
}
