'use client'

import { useRef } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { Button, type ButtonProps } from '../button'
import { useHoldButtonGesture } from './use-hold-button-gesture'

/**
 * The end of a hold runs whatever the caller does. A caller `preventDefault()`
 * that skipped the cancel would leave the timer to fire `onHoldComplete` after
 * the user let go (CONVENTIONS.md §3.9, the third case).
 */
const alwaysEnd = { checkForDefaultPrevented: false }

/**
 * Props for {@link HoldButton}: the non-anchor {@link ButtonProps} branch minus
 * `href`, `onClick`, and `loading`, plus the hold-gesture hooks.
 */
export type HoldButtonProps = Omit<
	ButtonProps & { href?: never },
	'href' | 'onClick' | 'loading'
> & {
	/**
	 * Press duration, in milliseconds, required to fire `onHoldComplete`.
	 * @defaultValue 1000
	 */
	duration?: number
	/** Fires once the press is held for the full `duration`. */
	onHoldComplete?: () => void
	/** Fires when a press begins (pointer down or Space/Enter keydown). */
	onHoldStart?: () => void
	/** Fires when a press is released or interrupted before `duration` elapses. */
	onHoldCancel?: () => void
}

/**
 * Button that fires `onHoldComplete` only after a sustained press of `duration` ms.
 * A fill overlay animates progress, and releasing early cancels. Responds to
 * both pointer hold and Space/Enter keydown.
 *
 * @remarks
 * Only the activation key that started the hold cancels it; the other key's
 * release mid-hold is ignored. Blur and pointer leave/cancel abort the hold, and
 * the gesture hook adds window-blur and tab-visibility guards so a backgrounded
 * tab cannot silently complete it. Left mouse button only (`button === 0`).
 *
 * A caller's pointer and key handlers run before the hold logic. A caller
 * `preventDefault()` on a pointer press or an activation keydown keeps the hold
 * from starting. It never skips the cancel on a release, a blur, or a pointer
 * leave or cancel.
 * @see {@link useHoldButtonGesture} for the timer, fill animation, and guards.
 */
export function HoldButton({
	duration = 1000,
	onHoldComplete,
	onHoldStart,
	onHoldCancel,
	disabled,
	children,
	className,
	onPointerDown,
	onPointerUp,
	onPointerCancel,
	onPointerLeave,
	onKeyDown,
	onKeyUp,
	onBlur,
	'data-slot': slot = 'hold-button',
	...props
}: HoldButtonProps) {
	const { fillRef, start, cancel } = useHoldButtonGesture({
		duration,
		disabled,
		onHoldComplete,
		onHoldStart,
		onHoldCancel,
	})

	// The key that initiated the hold. Only its own keyup cancels; releasing
	// the *other* activation key mid-hold does not abort the hold.
	const heldKeyRef = useRef<string | null>(null)

	return (
		<Button
			{...props}
			// Consumer props spread first; the `type` after them takes precedence,
			// so a caller cannot turn the hold gate into a form submit.
			type="button"
			disabled={disabled}
			data-slot={slot}
			className={cn('relative overflow-hidden select-none [-webkit-touch-callout:none]', className)}
			onPointerDown={composeEventHandlers(onPointerDown, (event) => {
				if (event.button === 0) start()
			})}
			onPointerUp={composeEventHandlers(onPointerUp, cancel, alwaysEnd)}
			onPointerCancel={composeEventHandlers(onPointerCancel, cancel, alwaysEnd)}
			onPointerLeave={composeEventHandlers(onPointerLeave, cancel, alwaysEnd)}
			onKeyDown={composeEventHandlers(onKeyDown, (event) => {
				if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) {
					heldKeyRef.current ??= event.key

					start()
				}
			})}
			onKeyUp={composeEventHandlers(
				onKeyUp,
				(event) => {
					if (event.key === heldKeyRef.current) {
						heldKeyRef.current = null

						cancel()
					}
				},
				alwaysEnd,
			)}
			onBlur={composeEventHandlers(
				onBlur,
				() => {
					// Tab-away routes the keyup elsewhere; an unfocused button does not
					// complete the hold. The gesture hook guards window/visibility loss.
					heldKeyRef.current = null

					cancel()
				},
				alwaysEnd,
			)}
		>
			<span
				ref={fillRef}
				aria-hidden="true"
				style={{ transform: 'scaleX(0)' }}
				className="pointer-events-none absolute inset-0 origin-left bg-current/20"
			/>
			<span className="relative inline-flex items-center gap-[inherit]">{children}</span>
		</Button>
	)
}
