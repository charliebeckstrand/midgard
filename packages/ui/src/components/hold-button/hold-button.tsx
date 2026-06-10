'use client'

import { type FocusEvent, type KeyboardEvent, type PointerEvent, useRef } from 'react'
import { cn } from '../../core'
import { Button, type ButtonProps } from '../button'
import { useHoldButtonGesture } from './use-hold-button-gesture'

export type HoldButtonProps = Omit<
	ButtonProps & { href?: never },
	'href' | 'onClick' | 'loading'
> & {
	duration?: number
	onComplete?: () => void
	onHoldStart?: () => void
	onHoldCancel?: () => void
}

/**
 * Button that fires `onComplete` only after a sustained press of `duration` ms —
 * a fill overlay animates progress, and releasing early cancels. Responds to
 * both pointer hold and Space/Enter keydown.
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

	// The key that initiated the hold. Only its own keyup cancels — pressing
	// and releasing the *other* activation key mid-hold must not abort it.
	const heldKeyRef = useRef<string | null>(null)

	return (
		<Button
			{...props}
			disabled={disabled}
			data-slot="hold-button"
			className={cn('relative overflow-hidden select-none [-webkit-touch-callout:none]', className)}
			onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
				if (e.button === 0) start()

				onPointerDown?.(e)
			}}
			onPointerUp={(e: PointerEvent<HTMLButtonElement>) => {
				cancel()

				onPointerUp?.(e)
			}}
			onPointerCancel={(e: PointerEvent<HTMLButtonElement>) => {
				cancel()

				onPointerCancel?.(e)
			}}
			onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
				cancel()

				onPointerLeave?.(e)
			}}
			onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
				if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) {
					heldKeyRef.current ??= e.key

					start()
				}

				onKeyDown?.(e)
			}}
			onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
				if (e.key === heldKeyRef.current) {
					heldKeyRef.current = null

					cancel()
				}

				onKeyUp?.(e)
			}}
			onBlur={(e: FocusEvent<HTMLButtonElement>) => {
				// Tab-away routes the keyup elsewhere; an unfocused button must not
				// complete an irreversible hold (window/visibility loss is guarded
				// in the gesture hook).
				heldKeyRef.current = null

				cancel()

				onBlur?.(e)
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
