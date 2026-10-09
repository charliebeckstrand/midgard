'use client'

import { type KeyboardEvent, type MouseEvent, type Ref, useRef } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { isPrimaryPress } from '../../utilities/primary-press'
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
	type = 'button',
	ref,
	...props
}: HoldButtonProps) {
	const buttonRef = useRef<HTMLButtonElement>(null)

	const composedRef = useComposedRef(buttonRef, ref as Ref<HTMLButtonElement> | undefined)

	// A `submit` or `reset` button acts on its form here, after the hold, and
	// not on the native click.
	const handleHoldComplete = useStableEvent(() => {
		onHoldComplete?.()

		const button = buttonRef.current

		const form = button?.form

		if (!button || !form) return

		if (type === 'submit') form.requestSubmit(button)
		else if (type === 'reset') form.reset()
	})

	// A quick press sends a native click after the pointer pair, and Enter sends
	// one on keydown. Cancel it, or a `submit` or `reset` button acts on its
	// form before the hold completes.
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		if (type !== 'button') event.preventDefault()
	}

	const { fillRef, start, cancel } = useHoldButtonGesture({
		duration,
		disabled,
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
		if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return

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

		cancel()
	})

	return (
		<Button
			{...props}
			ref={composedRef}
			type={type}
			disabled={disabled}
			data-slot={slot}
			className={cn('relative overflow-hidden select-none [-webkit-touch-callout:none]', className)}
			onPointerDown={composeEventHandlers(onPointerDown, (event) => {
				// A held touch selects no text on the page.
				holdTextSelection(event)

				if (isPrimaryPress(event)) start()
			})}
			onPointerUp={composeEventHandlers(onPointerUp, cancel, alwaysEnd)}
			onPointerCancel={composeEventHandlers(onPointerCancel, cancel, alwaysEnd)}
			onPointerLeave={composeEventHandlers(onPointerLeave, cancel, alwaysEnd)}
			onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
			onKeyUp={composeEventHandlers(onKeyUp, handleKeyUp, alwaysEnd)}
			onBlur={composeEventHandlers(onBlur, handleBlur, alwaysEnd)}
			onClick={handleClick}
		>
			{/* A Motion element holds its rest scale as a transform string. For a plain span,
			Motion reads the computed matrix. A matrix of scale 0 does not interpolate, so
			the first hold would jump to full. The element holds the string only when the
			features that a `ReducedMotion` root loads have arrived. */}
			<ReducedMotion>
				<m.span
					ref={fillRef}
					aria-hidden="true"
					initial={{ transform: 'scaleX(0)' }}
					className="pointer-events-none absolute inset-0 origin-left rtl:origin-right bg-current/20"
				/>
			</ReducedMotion>
			<span className="relative inline-flex items-center gap-[inherit]">{children}</span>
		</Button>
	)
}
