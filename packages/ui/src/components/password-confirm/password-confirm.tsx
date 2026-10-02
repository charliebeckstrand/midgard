'use client'

import {
	type ReactNode,
	type SyntheticEvent,
	useCallback,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useA11yLiveRegion } from '../../hooks'
import { useFormContext } from '../form/context'
import { Text } from '../text'
import { PasswordConfirmContext } from './context'
import { handlePasswordInput, readFieldValues } from './password-confirm-utilities'
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
 *
 * @remarks
 * The password field is the `PasswordInput` inside the coordinator, found by
 * its `password-input` anchor. Other inputs, such as a username field, do not
 * count. The coordinator also reads both fields after each commit, so a
 * seeded, controlled, or reset value counts with no typed input.
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

	const { status, setPassword, setConfirm, setLastEdited, setConfirmValue } =
		usePasswordConfirmState({
			disabled: Boolean(passwordError),
			onMatchChange,
		})

	const rootRef = useRef<HTMLDivElement>(null)

	// A seeded, controlled, or reset value gets to the DOM with no `input` event.
	// Read both fields after each commit, so the state follows such a value. An
	// unchanged value is a no-op, because a state setter ignores an equal value.
	useLayoutEffect(() => {
		const root = rootRef.current

		if (!root) return

		const { password, confirm } = readFieldValues(root)

		if (password) {
			setPassword(password.value)

			setPasswordName(password.name)
		}

		if (confirm !== undefined) setConfirmValue(confirm)
	})

	const handleInput = useCallback(
		(event: SyntheticEvent<HTMLDivElement>) =>
			handlePasswordInput(event, setPassword, setPasswordName, setLastEdited),
		[setPassword, setLastEdited],
	)

	const generatedWarningId = useId()

	// Gate on truthiness, matching the render below: a falsy-but-non-null `warning`
	// (the `cond && 'text'` idiom with `cond` false) puts no text in the region, so
	// handing the id to the confirm field's aria-describedby would point it at an
	// empty description.
	const warningId = warning ? generatedWarningId : undefined

	const context = useMemo(
		() => ({ status, setConfirm, setConfirmName, confirmHasFormError, warningId }),
		[status, setConfirm, confirmHasFormError, warningId],
	)

	const liveWarning = useA11yLiveRegion()

	return (
		<PasswordConfirmContext value={context}>
			<div ref={rootRef} data-slot="password-confirm" className={className} onInput={handleInput}>
				<div className="space-y-4">{children}</div>
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
