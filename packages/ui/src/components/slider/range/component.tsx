'use client'

import { type CSSProperties, useRef } from 'react'
import { cn } from '../../../core'
import { useControllable } from '../../../hooks/use-controllable'
import { sliderRange as k } from '../../../recipes/katachi/slider-range'
import { useRangeKeyboard } from './use-range-keyboard'
import { useRangePointer } from './use-range-pointer'
import { pct } from './utilities'

type RangeSliderSize = keyof typeof k.size
type RangeSliderColor = keyof typeof k.color

export type RangeSliderProps = {
	value?: [number, number]
	defaultValue?: [number, number]
	onChange?: (value: [number, number]) => void
	min?: number
	max?: number
	step?: number
	size?: RangeSliderSize
	color?: RangeSliderColor
	disabled?: boolean
	className?: string
	style?: CSSProperties
}

export function RangeSlider({
	value,
	defaultValue,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	size: sizeProp,
	color: colorProp,
	disabled = false,
	className,
	style,
}: RangeSliderProps) {
	const size = sizeProp ?? k.defaults.size
	const color = colorProp ?? k.defaults.color

	const [range, setRange] = useControllable<[number, number]>({
		value,
		defaultValue: defaultValue ?? [min, max],
		onChange: onChange
			? (v) => {
					if (v !== undefined) onChange(v)
				}
			: undefined,
	})

	const current = range ?? [min, max]

	const trackRef = useRef<HTMLDivElement>(null)

	const { onPointerDown, onPointerMove, onPointerUp } = useRangePointer({
		min,
		max,
		step,
		disabled,
		current,
		trackRef,
		setRange,
	})

	const handleKeyDown = useRangeKeyboard({ min, max, step, current, setRange })

	const lo = pct(current[0], min, max)
	const hi = pct(current[1], min, max)

	const sizeClasses = k.size[size]

	return (
		<div
			data-slot="slider-range"
			data-disabled={disabled || undefined}
			className={cn(k.root, sizeClasses.root, k.color[color], className)}
			style={style}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
		>
			{/* Track */}
			<div
				ref={trackRef}
				data-slot="slider-range-track"
				className={cn(k.track, sizeClasses.track, 'top-1/2 -translate-y-1/2')}
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
				type="button"
				role="slider"
				tabIndex={disabled ? -1 : 0}
				disabled={disabled}
				aria-valuemin={min}
				aria-valuemax={current[1]}
				aria-valuenow={current[0]}
				aria-label="Range start"
				data-slot="slider-range-thumb"
				className={cn(k.thumb, sizeClasses.thumb, 'top-1/2 -translate-y-1/2')}
				style={{ left: `${lo}%` }}
				onKeyDown={handleKeyDown(0)}
			/>

			{/* High thumb */}
			<button
				type="button"
				role="slider"
				tabIndex={disabled ? -1 : 0}
				disabled={disabled}
				aria-valuemin={current[0]}
				aria-valuemax={max}
				aria-valuenow={current[1]}
				aria-label="Range end"
				data-slot="slider-range-thumb"
				className={cn(k.thumb, sizeClasses.thumb, 'top-1/2 -translate-y-1/2')}
				style={{ left: `${hi}%` }}
				onKeyDown={handleKeyDown(1)}
			/>
		</div>
	)
}
