'use client'

import type { ComponentPropsWithoutRef, CSSProperties } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { type SliderVariants, sliderVariants } from '../../recipes/kata/slider'
import { pct } from '../../utilities'

type SliderBaseProps = SliderVariants & {
	value?: number
	defaultValue?: number
	onValueChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
}

export type SliderProps = SliderBaseProps &
	Omit<
		ComponentPropsWithoutRef<'input'>,
		'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'type' | 'size' | 'color'
	>

export function Slider({
	value,
	defaultValue,
	onValueChange,
	min = 0,
	max = 100,
	step = 1,
	size,
	color,
	className,
	style,
	...props
}: SliderProps) {
	const [internal, setInternal] = useControllable<number>({
		value,
		defaultValue: defaultValue ?? min,
		onValueChange: (next) => {
			if (next !== undefined) onValueChange?.(next)
		},
	})

	const current = internal ?? min

	const percent = pct(current, min, max)

	return (
		<input
			type="range"
			data-slot="slider"
			min={min}
			max={max}
			step={step}
			value={current}
			onChange={(event) => setInternal(Number(event.target.value))}
			className={cn(sliderVariants({ size, color }), className)}
			style={{ ...style, '--slider-value': `${percent}%` } as CSSProperties}
			{...props}
		/>
	)
}
