'use client'

import { type ReactNode, type SyntheticEvent, useCallback, useId, useMemo, useState } from 'react'
import { useA11yLiveRegion } from '../../hooks'
import { useFormContext } from '../form/context'
import { Text } from '../text'
import { PasswordConfirmContext } from './context'
import { handlePasswordInput } from './password-confirm-utilities'
import { usePasswordConfirmState } from './use-password-confirm-state'

/** Props for {@link PasswordConfirm}. */
export type PasswordConfirmProps = {
	/** Message shown while the two fields disagree (and the password has no form error). */
	warning?: ReactNode
	className?: string
	children?: ReactNode
	/** Fires when both fields become non-empty and equal; on transition only, not while the password has a form error. */
	onPasswordMatch?: () => void
	/** Fires when the fields transition to a confirmed mismatch (both non-empty, unequal, confirm caught up). */
	onPasswordMismatch?: () => void
}

/**
 * Coordinator for a password and its confirmation field. Tracks match status
 * across both inputs and surfaces a `warning` until they agree, suppressed
 * while the password has a form error.
 */
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
		(event: SyntheticEvent<HTMLDivElement>) =>
			handlePasswordInput(event, setPassword, setPasswordName, setLastEdited),
		[setPassword, setLastEdited],
	)

	const generatedWarningId = useId()

	const warningId = warning != null ? generatedWarningId : undefined

	const context = useMemo(
		() => ({ status, setConfirm, setConfirmName, confirmHasFormError, warningId }),
		[status, setConfirm, confirmHasFormError, warningId],
	)

	const liveWarning = useA11yLiveRegion({ className: 'pt-2' })

	return (
		<PasswordConfirmContext value={context}>
			<div data-slot="password-confirm" className={className} onInput={handleInput}>
				<div className="space-y-4">{children}</div>
				{status === 'warning' && warning && !confirmHasFormError && (
					<div {...liveWarning} id={warningId}>
						<Text color="amber">{warning}</Text>
					</div>
				)}
			</div>
		</PasswordConfirmContext>
	)
}
