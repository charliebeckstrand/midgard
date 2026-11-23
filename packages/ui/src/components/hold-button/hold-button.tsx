'use client'

import { useComposedRefs } from 'motion/react'
import {
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type Ref,
	useId,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core/announcer'
import { cn } from '../../core/cn'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { joinAriaIds } from '../../hooks/use-aria-ids'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useTimeout } from '../../hooks/use-timeout'
import { useControlLock } from '../../primitives/control/context'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/hold-button'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { isActivationKey } from '../../utilities/keyboard-navigation'
import { isPrimaryPress } from '../../utilities/primary-press'
import { Button, type ButtonProps } from '../button'
import { useHoldButtonGesture } from './use-hold-button-gesture'

/**
 * The end of a hold runs whatever the caller does. A caller `preventDefault()`
 * that skipped the cancel would leave the timer to fire `onHoldComplete` after
 * the user let go (CONVENTIONS.md §3.9, the third case).
 */
const alwaysEnd = { checkForDefaultPrevented: false }

const messages = defineMessages({
	instruction: {
		id: 'ui.holdButton.instruction',
		defaultMessage: 'Press and hold to confirm',
		description:
			'The description of a button that acts only after the reader presses and holds it.',
	},
	confirm: {
		id: 'ui.holdButton.confirm',
		defaultMessage: 'Activate again to confirm',
		description:
			'Spoken when assistive technology activates a hold button once. A second activation does the action.',
	},
})

/**
 * The time, in milliseconds, in which a second click from assistive technology
 * completes the action that the first click armed.
 */
const CONFIRM_WINDOW_MS = 5000

/**
 * Props for {@link HoldButton}: the non-anchor {@link ButtonProps} branch minus
 * `href`, `onClick`, and `loading`, plus the hold-gesture hooks.
 */
export type HoldButtonProps = Omit<
	ButtonProps & { href?: never },
	'href' | 'onClick' | 'loading'
> & {
	/**
	 * The button type. A `submit` or `reset` button acts on its form only when the hold
	 * completes, and not on a click.
	 * @defaultValue 'button'
	 */
	type?: 'button' | 'submit' | 'reset'
	/**
	 * Press duration, in milliseconds, required to fire `onHoldComplete`.
	 * @defaultValue 1000
	 */
	duration?: number
	/** Fires when the reader holds the press for the full `duration`. */
	onHoldComplete?: () => void
	/** Fires when a press begins (pointer down or Space/Enter keydown). */
	onHoldStart?: () => void
	/** Fires when a press is released or interrupted before `duration` elapses. */
	onHoldCancel?: () => void
}

/**
 * A button that acts only after a press held for `duration` ms. It then fires
 * `onHoldComplete`. A fill overlay animates progress, and releasing early
 * cancels. Responds to both pointer hold and Space/Enter keydown.
 *
 * The button has a built-in description, "Press and hold to confirm", through
 * `aria-describedby`. A caller `aria-describedby` comes before it.
 *
 * @remarks
 * Assistive technology, such as a screen reader in browse mode or a switch
 * device, often sends a click with no pointer press and no key press. Such a
 * click cannot start a hold. Thus it arms a confirm step: the button announces
 * "Activate again to confirm", and a second click of the same kind in the next
 * five seconds completes the action. A click that follows a pointer press or an
 * activation keydown is the end of a press, and it never arms or completes.
 * Thus a pointer or a keyboard user must hold.
 *
 * Only the activation key that started the hold cancels it; the other key's
 * release mid-hold is ignored. Blur and pointer leave/cancel abort the hold, and
 * the gesture hook adds window-blur and tab-visibility guards so a backgrounded
 * tab cannot silently complete it. Only a primary press starts a pointer hold: the primary
 * pointer and button, with no Ctrl. Thus a macOS Ctrl-click, which opens a context menu, starts
 * no hold.
 *
 * A caller's pointer and key handlers run before the hold logic. A caller
 * `preventDefault()` on a pointer press or an activation keydown keeps the hold
 * from starting. It never skips the cancel on a release, a blur, or a pointer
 * leave or cancel.
 *
 * A `type` of `submit` or `reset` acts on the form only when the hold completes.
 * The button cancels its native click, so a quick press or the Enter key does
 * not submit. After `onHoldComplete`, a `submit` button calls
 * `form.requestSubmit()` with itself as the submitter, and a `reset` button
 * calls `form.reset()`. The default `type` is `button`.
 *
 * In a locked scope, such as a `Form` while a submit runs, the hold is the
 * activation that the lock cancels. A press starts no hold, and a lock that
 * comes during a hold cancels it. Pass `lockable={false}` to keep it live.
 * @see {@link useHoldButtonGesture} for the timer, fill animation, and guards.
 */
export function HoldButton({
	duration = 1000,
	onHoldComplete,
	onHoldStart,
	onHoldCancel,
	disabled,
	lockable = true,
	children,
	className,
	onPointerDown,
	onPointerUp,
	onPointerCancel,
	onPointerLeave,
	onKeyDown,
	onKeyUp,
	onBlur,
	'aria-describedby': describedBy,
	'data-slot': slot = 'hold-button',
	type = 'button',
	ref,
	...props
}: HoldButtonProps) {
	const buttonRef = useRef<HTMLButtonElement>(null)

	const composedRef = useComposedRefs(buttonRef, ref as Ref<HTMLButtonElement> | undefined)

	const intl = useIntl()

	const instructionId = useId()

	// True from a pointer press or an activation keydown until the click that
	// the press sends. A click with no such press comes from assistive
	// technology, which cannot hold.
	const pressedRef = useRef(false)

	// True after a click from assistive technology, until a second such click
	// completes the action or the confirm window ends.
	const [armed, setArmed] = useState(false)

	const armTimer = useTimeout()

	// It writes a ref, so it is a stable event and not a closure that render
	// passes to a function.
	const markPress = useStableEvent(() => {
		pressedRef.current = true
	})

	const disarm = () => {
		armTimer.clear()

		setArmed(false)
	}

	// A `submit` or `reset` button acts on its form here, after the hold, and
	// not on the native click.
	const handleHoldComplete = useStableEvent(() => {
		disarm()

		onHoldComplete?.()

		const button = buttonRef.current

		const form = button?.form

		if (!button || !form) return

		if (type === 'submit') form.requestSubmit(button)
		else if (type === 'reset') form.reset()
	})

	// A locked scope cancels each activation of a button, and the hold is the
	// activation of this one.
	const locked = useControlLock() && lockable

	// A quick press sends a native click after the pointer pair, and Enter sends
	// one on keydown. Cancel it, or a `submit` or `reset` button acts on its
	// form before the hold completes. A locked scope replaces this handler, so
	// it never runs while the lock holds.
	const handleClick = useStableEvent((event: MouseEvent<HTMLButtonElement>) => {
		if (type !== 'button') event.preventDefault()

		if (pressedRef.current) {
			pressedRef.current = false

			return
		}

		if (armed) {
			handleHoldComplete()

			return
		}

		setArmed(true)

		armTimer.set(() => setArmed(false), CONFIRM_WINDOW_MS)

		announce(intl.formatMessage(messages.confirm))
	})

	const { fillRef, start, cancel } = useHoldButtonGesture({
		duration,
		disabled: disabled || locked,
		onHoldComplete: handleHoldComplete,
		onHoldStart,
		onHoldCancel,
	})

	// The key that initiated the hold. Only its own keyup cancels; releasing
	// the *other* activation key mid-hold does not abort the hold.
	const heldKeyRef = useRef<string | null>(null)

	// The key handlers read the held-key ref, so each is a stable event and not
	// a closure that render passes to a function.
	const handleKeyDown = useStableEvent((event: KeyboardEvent<HTMLButtonElement>) => {
		if (!isActivationKey(event.key)) return

		// A held Enter sends a click on each repeat, so each repeat marks a press.
		pressedRef.current = true

		if (event.repeat) return

		if (heldKeyRef.current === null) heldKeyRef.current = event.key

		start()
	})

	const handleKeyUp = useStableEvent((event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== heldKeyRef.current) return

		heldKeyRef.current = null

		cancel()
	})

	// Tab-away routes the keyup elsewhere; an unfocused button does not complete
	// the hold. The gesture hook guards window/visibility loss.
	const handleBlur = useStableEvent(() => {
		heldKeyRef.current = null

		pressedRef.current = false

		cancel()
	})

	return (
		<Button
			{...props}
			ref={composedRef}
			type={type}
			disabled={disabled}
			lockable={lockable}
			data-slot={slot}
			className={cn('relative select-none [-webkit-touch-callout:none]', className)}
			onPointerDown={composeEventHandlers(
				// A caller `preventDefault()` stops the hold but not the click that
				// follows, so the press is marked in each case.
				composeEventHandlers(onPointerDown, markPress, alwaysEnd),
				(event: PointerEvent<HTMLButtonElement>) => {
					// A held touch selects no text on the page.
					holdTextSelection(event)

					if (isPrimaryPress(event)) start()
				},
			)}
			onPointerUp={composeEventHandlers(onPointerUp, cancel, alwaysEnd)}
			onPointerCancel={composeEventHandlers(onPointerCancel, cancel, alwaysEnd)}
			onPointerLeave={composeEventHandlers(onPointerLeave, cancel, alwaysEnd)}
			onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
			onKeyUp={composeEventHandlers(onKeyUp, handleKeyUp, alwaysEnd)}
			onBlur={composeEventHandlers(onBlur, handleBlur, alwaysEnd)}
			onClick={handleClick}
			aria-describedby={joinAriaIds([describedBy, instructionId])}
		>
			{/* The clip holds the fill in the box of the button. The button does not
			    clip, so the hit area of its TouchTarget can go past its box. */}
			<span aria-hidden="true" className={k().clip}>
				<span
					ref={fillRef}
					// An inline transform, not a `scale-x-0` class: Tailwind sets `scale`,
					// which the `transform` that Motion writes does not replace.
					style={{ transform: 'scaleX(0)' }}
					className={k().fill}
				/>
			</span>
			<span className="relative inline-flex items-center gap-[inherit]">{children}</span>
			<span id={instructionId} hidden>
				{intl.formatMessage(armed ? messages.confirm : messages.instruction)}
			</span>
		</Button>
	)
}
