'use client'

import { type ReactNode, useCallback, useId, useMemo, useState } from 'react'
import { useA11yLiveRegion } from '../../hooks'
import { Stack } from '../../structure/stack'
import { useFormContext } from '../form/context'
import { Text } from '../text'
import { PasswordConfirmContext, type PasswordConfirmRole } from './context'
import { usePasswordConfirmState } from './use-password-confirm-state'

/** Props for {@link PasswordConfirm}. */
export type PasswordConfirmProps = {
	/** Message shown while the two fields disagree (and the password has no form error). */
	warning?: ReactNode
	className?: string
	children?: ReactNode
	/**
	 * Fires on a confirmed match/mismatch transition: `true` once both fields are
	 * non-empty and equal, `false` once they settle non-empty and unequal. It also
	 * fires `false` when a match ends because a field becomes empty or the
	 * confirmation becomes partial. Transitions only (no re-fire on repeats), and
	 * never while the password has a form error.
	 */
	onMatchChange?: (matched: boolean) => void
}

/**
 * Coordinator for a password and its confirmation field. Tracks match status
 * across a {@link PasswordConfirmNew} and a {@link PasswordConfirmRepeat},
 * and surfaces a `warning` until they agree, suppressed while the password has
 * a form error.
 *
 * @remarks
 * The two parts report the values that they show, so a form reset, a seeded
 * value, and a controlled value update the match state. Other inputs inside
 * the coordinator, such as a username field, do not feed it.
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

	const confirmHasFormError = Boolean(confirmName && form?.errors[confirmName])

	const { status, setPassword, setConfirm, setLastEdited } = usePasswordConfirmState({
		disabled: Boolean(passwordError),
		onMatchChange,
	})

	const setValue = useCallback(
		(role: PasswordConfirmRole, value: string) =>
			role === 'password' ? setPassword(value) : setConfirm(value),
		[setPassword, setConfirm],
	)

	const setName = useCallback(
		(role: PasswordConfirmRole, name: string | undefined) =>
			role === 'password' ? setPasswordName(name) : setConfirmName(name),
		[],
	)

	const generatedWarningId = useId()

	// Gate on truthiness, matching the render below: a falsy-but-non-null `warning`
	// (the `cond && 'text'` idiom with `cond` false) puts no text in the region, so
	// handing the id to the confirm field's aria-describedby would point it at an
	// empty description.
	const warningId = warning ? generatedWarningId : undefined

	const context = useMemo(
		() => ({
			status,
			setValue,
			setName,
			setEdited: setLastEdited,
			confirmHasFormError,
			warningId,
		}),
		[status, setValue, setName, setLastEdited, confirmHasFormError, warningId],
	)

	const liveWarning = useA11yLiveRegion()

	return (
		<PasswordConfirmContext value={context}>
			<div data-slot="password-confirm" className={className}>
				<Stack gap="lg">{children}</Stack>
				{/*
					The region stays mounted and only its children change: a live region that
					enters the DOM together with its text does not announce. The spacing moves
					with the warning, so the empty region has no height.
				*/}
				<div {...liveWarning} id={warningId}>
					{status === 'warning' && warning && !confirmHasFormError && (
						<Text className="pt-2" color="amber">
							{warning}
						</Text>
					)}
				</div>
			</div>
		</PasswordConfirmContext>
	)
}
