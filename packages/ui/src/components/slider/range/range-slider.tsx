'use client'

import { type CSSProperties, useRef } from 'react'
import { cn } from '../../../core'
import { useControllable } from '../../../hooks/use-controllable'
import { useDensity } from '../../../primitives/density'
import { k, type RangeSliderVariants } from '../../../recipes/kata/slider-range'
import { pct } from '../../../utilities'
import { useRangeKeyboard } from './use-range-keyboard'
import { useRangePointer } from './use-range-pointer'

export type RangeSliderProps = {
	value?: [number, number]
	defaultValue?: [number, number]
	onValueChange?: (value: [number, number]) => void
	min?: number
	max?: number
	step?: number
	size?: RangeSliderVariants['size']
	color?: RangeSliderVariants['color']
	disabled?: boolean
	/**
	 * Whether moving a thumb past the other swaps their roles. When `false`,
	 * each thumb is clamped at the other's value. On a keyboard swap, focus
	 * follows the moving value to the other thumb button. Defaults to `true`.
	 */
	allowCross?: boolean
	/**
	 * Accessible names for the `[start, end]` thumbs. Override the generic
	 * defaults so each range announces what it bounds (e.g. `['Min price', 'Max
	 * price']`). Defaults to `['Range start', 'Range end']`.
	 */
	labels?: [string, string]
	/** Formats a thumb's value for assistive tech (`aria-valuetext`) — currency, ratings, levels announce as meaningful text instead of a bare number. */
	getValueText?: (value: number, thumb: 0 | 1) => string
	className?: string
	style?: CSSProperties
}

export function RangeSlider({
	value,
	defaultValue,
	onValueChange,
	min = 0,
	max = 100,
	step = 1,
	size,
	color,
	disabled = false,
	allowCross = true,
	labels = ['Range start', 'Range end'],
	getValueText,
	className,
	style,
}: RangeSliderProps) {
	const [range, setRange] = useControllable<[number, number]>({
		value,
		defaultValue: defaultValue ?? [min, max],
		onValueChange: onValueChange
			? (v) => {
					if (v !== undefined) onValueChange(v)
				}
			: undefined,
	})

	const current = range ?? [min, max]

	// Resolves size through the Density cascade: explicit prop > ambient Density,
	// falling back to `'md'` outside any provider.
	const { size: inheritedSize } = useDensity()

	const resolvedSize = size ?? inheritedSize

	const trackRef = useRef<HTMLDivElement>(null)
	const loThumbRef = useRef<HTMLButtonElement>(null)
	const hiThumbRef = useRef<HTMLButtonElement>(null)

	const overlap = allowCross ? 'swap' : 'clamp'

	const { onPointerDown, onPointerMove, onPointerUp } = useRangePointer({
		min,
		max,
		step,
		disabled,
		current,
		trackRef,
		setRange,
		overlap,
	})

	const handleKeyDown = useRangeKeyboard({
		min,
		max,
		step,
		current,
		setRange,
		overlap,
		thumbRefs: [loThumbRef, hiThumbRef],
	})

	const lo = pct(current[0], min, max)
	const hi = pct(current[1], min, max)

	return (
		<div
			data-slot="slider-range"
			data-disabled={disabled || undefined}
			className={cn(k.root({ size: resolvedSize, color }), className)}
			style={style}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			{/* Track */}
			<div
				ref={trackRef}
				data-slot="slider-range-track"
				className={cn(k.track({ size: resolvedSize }), 'top-1/2 -translate-y-1/2')}
			>
				{/* Filled range */}
				<div
					data-slot="slider-range-fill"
					className={cn(k.fill, 'h-full')}
					style={{ left: `${lo}%`, right: `${100 - hi}%` }}
				/>
			</div>

			{/* Low thumb */}
			<button
				ref={loThumbRef}
				type="button"
				role="slider"
				tabIndex={disabled ? -1 : 0}
				disabled={disabled}
				aria-valuemin={min}
				aria-valuemax={current[1]}
				aria-valuenow={current[0]}
				aria-valuetext={getValueText?.(current[0], 0)}
				aria-label={labels[0]}
				data-slot="slider-range-thumb"
				className={cn(k.thumb({ size: resolvedSize }), 'top-1/2 -translate-y-1/2')}
				style={{ left: `${lo}%` }}
				onKeyDown={handleKeyDown(0)}
			/>

			{/* High thumb */}
			<button
				ref={hiThumbRef}
				type="button"
				role="slider"
				tabIndex={disabled ? -1 : 0}
				disabled={disabled}
				aria-valuemin={current[0]}
				aria-valuemax={max}
				aria-valuenow={current[1]}
				aria-valuetext={getValueText?.(current[1], 1)}
				aria-label={labels[1]}
				data-slot="slider-range-thumb"
				className={cn(k.thumb({ size: resolvedSize }), 'top-1/2 -translate-y-1/2')}
				style={{ left: `${hi}%` }}
				onKeyDown={handleKeyDown(1)}
			/>
		</div>
	)
}
