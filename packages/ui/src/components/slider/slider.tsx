'use client'

import type { ComponentPropsWithoutRef, CSSProperties } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import { useDensity } from '../../primitives/density'
import { k, type SliderVariants } from '../../recipes/kata/slider'
import { pct } from '../../utilities'
import { useControlProps } from '../control/use-control-props'

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

/** Range input for a single value — controlled or uncontrolled, resolving `id`/`disabled`/`invalid` from an enclosing Control or Field, `size` from the Density cascade, and exposing fill position as a `--slider-value` CSS variable. */
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
	id,
	disabled,
	'aria-describedby': ariaDescribedBy,
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

	// Resolve id/disabled/describedby from a wrapping Control or Field, then fall
	// back to a generated id — the same chain Input uses. A range input has no
	// text of its own, so this is what lets a sibling <Label htmlFor> (or a
	// <Field><Label> with no explicit id) name it.
	// `required` is intentionally not resolved: a range input always has a value,
	// so the attribute does not apply to it (HTML constraint validation) — only
	// invalid + describedby carry meaning here.
	const controlProps = useControlProps({ id, disabled, 'aria-describedby': ariaDescribedBy })

	const scope = useIdScope({ id: controlProps.id })

	// Resolve size through the Density cascade for parity with the toggle
	// control family (checkbox / radio / switch): explicit prop > ambient
	// Density. Outside any provider this lands on 'md', the recipe default.
	const { size: inheritedSize } = useDensity()

	const resolvedSize = size ?? inheritedSize

	return (
		<input
			type="range"
			data-slot="slider"
			id={scope.id}
			disabled={controlProps.disabled}
			aria-describedby={controlProps['aria-describedby']}
			{...invalidAttrs(controlProps.invalid)}
			min={min}
			max={max}
			step={step}
			value={current}
			onChange={(event) => setInternal(Number(event.target.value))}
			className={cn(k({ size: resolvedSize, color }), className)}
			style={{ ...style, '--slider-value': `${percent}%` } as CSSProperties}
			{...props}
		/>
	)
}
