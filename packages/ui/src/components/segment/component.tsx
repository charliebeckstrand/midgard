'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import {
	ActiveIndicator,
	ActiveIndicatorScope,
	CurrentProvider,
	useActiveIndicator,
	useCurrent,
	useCurrentContext,
} from '../../primitives'
import { SegmentProvider, useSegmentContext } from './context'
import {
	k,
	type SegmentControlVariants,
	segmentControlVariants,
	segmentItemVariants,
} from './variants'

// ── Segment ─────────────────────────────────────────────

export type SegmentProps = SegmentControlVariants & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	className?: string
	children?: React.ReactNode
}

export function Segment({
	value: valueProp,
	defaultValue,
	onValueChange,
	size = 'md',
	className,
	children,
}: SegmentProps) {
	const [currentCtx] = useCurrent({
		value: valueProp,
		defaultValue,
		onChange: onValueChange,
	})

	const segmentCtx = useMemo(() => ({ size: size ?? ('md' as const) }), [size])

	return (
		<CurrentProvider value={currentCtx}>
			<SegmentProvider value={segmentCtx}>
				<div data-slot="segment" className={className}>
					{children}
				</div>
			</SegmentProvider>
		</CurrentProvider>
	)
}

// ── SegmentControl ──────────────────────────────────────

export type SegmentControlProps = SegmentControlVariants & {
	'aria-label'?: string
	className?: string
	children?: React.ReactNode
}

export function SegmentControl({
	'aria-label': ariaLabel,
	size: sizeProp,
	className,
	children,
}: SegmentControlProps) {
	const ctx = useSegmentContext()

	const size = sizeProp ?? ctx.size

	const containerRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(containerRef, {
		itemSelector: 'button[data-slot="segment-item"]:not(:disabled)',
		orientation: 'horizontal',
	})

	return (
		<ActiveIndicatorScope>
			<div
				ref={containerRef}
				data-slot="segment-control"
				role="radiogroup"
				aria-label={ariaLabel}
				onKeyDown={handleKeyDown}
				className={cn(segmentControlVariants({ size }), className)}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}

// ── SegmentItem ─────────────────────────────────────────

export type SegmentItemProps = {
	value: string
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

export function SegmentItem({ value, disabled, className, children }: SegmentItemProps) {
	const currentCtx = useCurrentContext()
	const { size } = useSegmentContext()

	const current = currentCtx?.value === value

	const indicator = useActiveIndicator()

	return (
		// biome-ignore lint/a11y/useSemanticElements: a styled button with role="radio" is standard for segmented controls
		<button
			data-slot="segment-item"
			data-current={current ? '' : undefined}
			type="button"
			role="radio"
			aria-checked={current}
			disabled={disabled}
			tabIndex={current ? 0 : -1}
			onClick={() => currentCtx?.onChange?.(value)}
			className={cn(segmentItemVariants({ size }), current && k.segmentCurrent, className)}
			{...indicator.tapHandlers}
		>
			<span className="relative z-10">{children}</span>
			{current && <ActiveIndicator ref={indicator.ref} className={cn(k.indicator)} />}
		</button>
	)
}
