'use client'

import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '../../core'
import { Button, type ButtonProps } from '../button'
import { useHoldGesture } from './use-hold-gesture'

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
	const { fillRef, start, cancel } = useHoldGesture({
		duration,
		disabled,
		onComplete,
		onHoldStart,
		onHoldCancel,
	})

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
			<span className="relative inline-flex items-center gap-[inherit]">{children}</span>
		</Button>
	)
}
