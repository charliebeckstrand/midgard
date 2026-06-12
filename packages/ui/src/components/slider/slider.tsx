'use client'

import type { ComponentPropsWithoutRef, CSSProperties, Ref } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { useDensity } from '../../primitives/density'
import { k, type SliderVariants } from '../../recipes/kata/slider'
import { pct } from '../../utilities'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'

type SliderBaseProps = SliderVariants & {
	value?: number
	defaultValue?: number
	onValueChange?: (value: number) => void
	min?: number
	max?: number
	step?: number
	/** Formats the value for assistive tech (`aria-valuetext`): currency, ratings, levels announce as meaningful text instead of a bare number. */
	getValueText?: (value: number) => string
	ref?: Ref<HTMLInputElement>
}

export type SliderProps = SliderBaseProps &
	Omit<
		ComponentPropsWithoutRef<'input'>,
		'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step' | 'type' | 'size' | 'color'
	>

/** Range input for a single value; controlled or uncontrolled, resolving `id`/`disabled`/`invalid` from an enclosing Control or Field, binding to an enclosing Form field by `name`, `size` from the Density cascade, and exposing fill position as a `--slider-value` CSS variable. */
export function Slider({
	value,
	defaultValue,
	onValueChange,
	min = 0,
	max = 100,
	step = 1,
	getValueText,
	size,
	color,
	className,
	style,
	id,
	disabled,
	name,
	onBlur,
	ref,
	'aria-describedby': ariaDescribedBy,
	...props
}: SliderProps) {
	const {
		value: internal,
		setValue: setInternal,
		setTouched,
		invalid,
	} = useFormValue<number>(name, {
		value,
		defaultValue: defaultValue ?? min,
		onValueChange: (next) => {
			if (next !== undefined) onValueChange?.(next)
		},
	})

	const current = internal ?? min

	const percent = pct(current, min, max)

	// Resolves id/disabled/describedby from a wrapping Control or Field, falling
	// back to a generated id (the same chain Input uses). A sibling <Label
	// htmlFor> (or a <Field><Label> with no explicit id) names the input via
	// this id. `required` is not resolved: a range input always has a value and
	// HTML constraint validation ignores the attribute; only invalid +
	// describedby carry meaning here.
	const controlProps = useControlProps({
		id,
		disabled,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	const scope = useIdScope({ id: controlProps.id })

	// Resolves size through the Density cascade: explicit prop > ambient Density.
	// Outside any provider falls back to `'md'`, the recipe default.
	const { size: inheritedSize } = useDensity()

	const resolvedSize = size ?? inheritedSize

	return (
		<input
			type="range"
			data-slot="slider"
			ref={ref}
			id={scope.id}
			disabled={controlProps.disabled}
			aria-describedby={controlProps['aria-describedby']}
			{...invalidAttrs(controlProps.invalid)}
			min={min}
			max={max}
			step={step}
			name={name}
			aria-valuetext={getValueText?.(current)}
			value={current}
			onChange={(event) => setInternal(Number(event.target.value))}
			onBlur={(e) => {
				setTouched()

				onBlur?.(e)
			}}
			className={cn(k({ size: resolvedSize, color }), className)}
			style={{ ...style, '--slider-value': `${percent}%` } as CSSProperties}
			{...props}
		/>
	)
}
