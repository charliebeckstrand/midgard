'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { useControllable, useRovingFocus } from '../../hooks'
import { ActiveIndicator, ActiveIndicatorScope, useActiveIndicator } from '../../primitives'
import { SegmentedControlProvider, useSegmentedControl } from './context'
import {
	type SegmentedControlVariants,
	k,
	segmentedControlVariants,
	segmentVariants,
} from './variants'

// ── SegmentedControl ───────────────────────────────────

export type SegmentedControlProps = SegmentedControlVariants & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	'aria-label'?: string
	className?: string
	children?: React.ReactNode
}

export function SegmentedControl({
	value: valueProp,
	defaultValue,
	onValueChange,
	'aria-label': ariaLabel,
	size = 'md',
	className,
	children,
}: SegmentedControlProps) {
	const [value, setValue] = useControllable({
		value: valueProp,
		defaultValue,
		onChange: onValueChange,
	})

	const containerRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(containerRef, {
		itemSelector: 'button[data-slot="segment"]:not(:disabled)',
		orientation: 'horizontal',
	})

	return (
		<SegmentedControlProvider value={{ value, onSelect: setValue, size: size ?? 'md' }}>
			<ActiveIndicatorScope>
				<div
					ref={containerRef}
					data-slot="segmented-control"
					role="radiogroup"
					aria-label={ariaLabel}
					onKeyDown={handleKeyDown}
					className={cn(segmentedControlVariants({ size }), className)}
				>
					{children}
				</div>
			</ActiveIndicatorScope>
		</SegmentedControlProvider>
	)
}

// ── Segment ────────────────────────────────────────────

export type SegmentProps = {
	value: string
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

export function Segment({ value, disabled, className, children }: SegmentProps) {
	const { value: selectedValue, onSelect, size } = useSegmentedControl()

	const current = selectedValue === value

	const indicator = useActiveIndicator()

	return (
		// biome-ignore lint/a11y/useSemanticElements: a styled button with role="radio" is standard for segmented controls
		<button
			data-slot="segment"
			data-current={current ? '' : undefined}
			type="button"
			role="radio"
			aria-checked={current}
			disabled={disabled}
			tabIndex={current ? 0 : -1}
			onClick={() => onSelect(value)}
			className={cn(segmentVariants({ size }), current && k.segmentCurrent, className)}
			{...indicator.tapHandlers}
		>
			<span className="relative z-10">{children}</span>
			{current && <ActiveIndicator ref={indicator.ref} className={cn(k.indicator)} />}
		</button>
	)
}
