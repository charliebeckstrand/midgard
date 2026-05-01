'use client'

import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { Button, type ButtonProps } from '../button'

const RESET_DURATION = 150

export type HoldButtonProps = Omit<
	ButtonProps & { href?: never },
	'href' | 'onClick' | 'loading'
> & {
	duration?: number
	onComplete?: () => void
	onHoldStart?: () => void
	onHoldCancel?: () => void
}

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
	...props
}: HoldButtonProps) {
	const fillRef = useRef<HTMLSpanElement>(null)

	const holdingRef = useRef(false)

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const setFill = (target: number, ms: number) => {
		const fill = fillRef.current

		if (!fill) return

		fill.style.transition = `transform ${ms}ms linear`

		fill.style.transform = `scaleX(${target})`
	}

	const clearTimer = () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)

			timerRef.current = null
		}
	}

	const start = () => {
		if (disabled || holdingRef.current) return

		holdingRef.current = true

		setFill(1, duration)

		clearTimer()

		timerRef.current = setTimeout(() => {
			timerRef.current = null

			holdingRef.current = false

			setFill(0, RESET_DURATION)

			onComplete?.()
		}, duration)

		onHoldStart?.()
	}

	const cancel = () => {
		if (!holdingRef.current) return

		holdingRef.current = false

		clearTimer()

		setFill(0, RESET_DURATION)

		onHoldCancel?.()
	}

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current)
		},
		[],
	)

	// If the button is disabled mid-hold, the pending timer would still fire
	// and call onComplete on a button the consumer just turned off. Cancel
	// the in-flight hold so the visual fill resets and onHoldCancel runs.
	const onHoldCancelRef = useRef(onHoldCancel)

	onHoldCancelRef.current = onHoldCancel

	useEffect(() => {
		if (!disabled || !holdingRef.current) return

		holdingRef.current = false

		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)

			timerRef.current = null
		}

		const fill = fillRef.current

		if (fill) {
			fill.style.transition = `transform ${RESET_DURATION}ms linear`

			fill.style.transform = 'scaleX(0)'
		}

		onHoldCancelRef.current?.()
	}, [disabled])

	return (
		<Button
			{...props}
			disabled={disabled}
			data-slot="hold-button"
			className={cn('relative overflow-hidden', className)}
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
				if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) start()

				onKeyDown?.(e)
			}}
			onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
				if (e.key === ' ' || e.key === 'Enter') cancel()

				onKeyUp?.(e)
			}}
		>
			<span
				ref={fillRef}
				aria-hidden="true"
				style={{ transform: 'scaleX(0)' }}
				className="pointer-events-none absolute inset-0 origin-left bg-black/15 dark:bg-white/20"
			/>
			<span className="relative inline-flex items-center gap-[inherit] select-none">
				{children}
			</span>
		</Button>
	)
}
