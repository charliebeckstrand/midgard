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
	/**
	 * Fires on a confirmed match/mismatch transition: `true` once both fields are
	 * non-empty and equal, `false` once they settle non-empty and unequal.
	 * Transitions only (no re-fire on repeats), and never while the password has
	 * a form error.
	 */
	onMatchChange?: (matched: boolean) => void
}

/**
 * Coordinator for a password and its confirmation field. Tracks match status
 * across both inputs and surfaces a `warning` until they agree, suppressed
 * while the password has a form error.
 */
export function PasswordConfirm({
	onMatchChange,
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
		onMatchChange,
	})

	const handleInput = useCallback(
		(event: SyntheticEvent<HTMLDivElement>) =>
			handlePasswordInput(event, setPassword, setPasswordName, setLastEdited),
		[setPassword, setLastEdited],
	)

	const generatedWarningId = useId()

	// Gate on truthiness, matching the render below: a falsy-but-non-null `warning`
	// (the `cond && 'text'` idiom with `cond` false) renders no warning element, so
	// handing the id to the confirm field's aria-describedby would dangle the idref.
	const warningId = warning ? generatedWarningId : undefined

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
