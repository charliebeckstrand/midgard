'use client'

import { type FocusEvent, type KeyboardEvent, type PointerEvent, useRef } from 'react'
import { cn } from '../../core'
import { Button, type ButtonProps } from '../button'
import { useHoldButtonGesture } from './use-hold-button-gesture'

/**
 * Props for {@link HoldButton}: the non-anchor {@link ButtonProps} branch minus
 * `href`, `onClick`, and `loading`, plus the hold-gesture hooks.
 */
export type HoldButtonProps = Omit<
	ButtonProps & { href?: never },
	'href' | 'onClick' | 'loading'
> & {
	/**
	 * Press duration, in milliseconds, required to fire `onComplete`.
	 * @defaultValue 1000
	 */
	duration?: number
	/** Fires once the press is held for the full `duration`. */
	onComplete?: () => void
	/** Fires when a press begins (pointer down or Space/Enter keydown). */
	onHoldStart?: () => void
	/** Fires when a press is released or interrupted before `duration` elapses. */
	onHoldCancel?: () => void
}

/**
 * Button that fires `onComplete` only after a sustained press of `duration` ms.
 * A fill overlay animates progress, and releasing early cancels. Responds to
 * both pointer hold and Space/Enter keydown.
 *
 * @remarks
 * Only the activation key that started the hold cancels it; the other key's
 * release mid-hold is ignored. Blur and pointer leave/cancel abort the hold, and
 * the gesture hook adds window-blur and tab-visibility guards so a backgrounded
 * tab cannot silently complete it. Left mouse button only (`button === 0`).
 * @see {@link useHoldButtonGesture} for the timer, fill animation, and guards.
 */
export function HoldButton({
	duration = 1000,
	onComplete,
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
	...props
}: HoldButtonProps) {
	const { fillRef, start, cancel } = useHoldButtonGesture({
		duration,
		disabled,
		onComplete,
		onHoldStart,
		onHoldCancel,
	})

	// The key that initiated the hold. Only its own keyup cancels; releasing
	// the *other* activation key mid-hold does not abort the hold.
	const heldKeyRef = useRef<string | null>(null)

	return (
		<Button
			{...props}
			disabled={disabled}
			data-slot="hold-button"
			className={cn('relative overflow-hidden select-none [-webkit-touch-callout:none]', className)}
			onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
				if (event.button === 0) start()

				onPointerDown?.(event)
			}}
			onPointerUp={(event: PointerEvent<HTMLButtonElement>) => {
				cancel()

				onPointerUp?.(event)
			}}
			onPointerCancel={(event: PointerEvent<HTMLButtonElement>) => {
				cancel()

				onPointerCancel?.(event)
			}}
			onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
				cancel()

				onPointerLeave?.(event)
			}}
			onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
				if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) {
					heldKeyRef.current ??= event.key

					start()
				}

				onKeyDown?.(event)
			}}
			onKeyUp={(event: KeyboardEvent<HTMLButtonElement>) => {
				if (event.key === heldKeyRef.current) {
					heldKeyRef.current = null

					cancel()
				}

				onKeyUp?.(event)
			}}
			onBlur={(event: FocusEvent<HTMLButtonElement>) => {
				// Tab-away routes the keyup elsewhere; an unfocused button does not
				// complete the hold. The gesture hook guards window/visibility loss.
				heldKeyRef.current = null

				cancel()

				onBlur?.(event)
			}}
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
