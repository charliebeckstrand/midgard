'use client'

import type { CSSProperties } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { type SliderVariants, sliderVariants } from './variants'

type SliderBaseProps = SliderVariants & {
	value?: number
	defaultValue?: number
	onChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
	className?: string
}

export type SliderProps = SliderBaseProps &
	Omit<
		React.ComponentPropsWithoutRef<'input'>,
		'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'type' | 'size' | 'color'
	>

export function Slider({
	value,
	defaultValue,
	onChange,
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
		onChange: (next) => {
			if (next !== undefined) onChange?.(next)
		},
	})

	const current = internal ?? min

	const pct = max === min ? 0 : ((current - min) / (max - min)) * 100

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
			style={{ ...style, '--slider-value': `${pct}%` } as CSSProperties}
			{...props}
		/>
	)
}
