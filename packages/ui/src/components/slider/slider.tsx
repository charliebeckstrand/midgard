'use client'

import type { ComponentProps, CSSProperties } from 'react'
import { ariaAttr, cn, composeEventHandlers, invalidAttrs } from '../../core'
import { useComposedRef } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { k, type SliderVariants } from '../../recipes/kata/slider'
import { pct } from '../../utilities'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'

type SliderBaseProps = SliderVariants & {
	value?: number
	defaultValue?: number
	onValueChange?: (value: number) => void
	/** @defaultValue 0 */
	min?: number
	/** @defaultValue 100 */
	max?: number
	/** @defaultValue 1 */
	step?: number
	/** Formats the value for assistive tech (`aria-valuetext`): currency, ratings, levels announce as meaningful text instead of a bare number. */
	getValueText?: (value: number) => string
	/**
	 * Keeps the value of the slider. A drag or a key does not change it, and
	 * `onValueChange` does not fire. The slider keeps the focus, submits its
	 * value, and sets `aria-readonly`. When omitted, it takes the value of an
	 * enclosing `<Control>` or `<Field>`.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
}

/** Props for {@link Slider}: the controllable value triad, `min`/`max`/`step` bounds, `getValueText` for assistive tech, plus `size`/`color` variants atop native range-`<input>` attributes. */
export type SliderProps = SliderBaseProps &
	Omit<
		ComponentProps<'input'>,
		| 'value'
		| 'defaultValue'
		| 'onChange'
		| 'min'
		| 'max'
		| 'step'
		| 'type'
		| 'size'
		| 'color'
		| 'readOnly'
	>

/**
 * Range input for a single value, controlled or uncontrolled. It resolves `id`,
 * `disabled`, `readOnly`, and `invalid` from an enclosing Control or Field, and binds to an
 * enclosing Form field by `name`. The slider takes the step of the nearest
 * density scope, and an explicit `size` opens a scope on the input. The
 * fill position is exposed as a `--slider-value` CSS variable.
 *
 * @remarks Renders a native `<input type="range">`, so screen-reader semantics
 * and arrow-key stepping come from the platform; only `aria-valuetext` is
 * augmented via `getValueText`. `defaultValue` falls back to `min` (an
 * uncontrolled slider with no default sits at the low end). `required` is
 * intentionally not resolved from context: a range input always carries a value
 * and HTML constraint validation ignores the attribute.
 * @see {@link RangeSlider} for the dual-thumb variant.
 */
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
	readOnly,
	name,
	onBlur,
	ref,
	'aria-describedby': ariaDescribedBy,
	...props
}: SliderProps) {
	const {
		value: bound,
		resetRef,
		setValue,
		setTouched,
		invalid,
	} = useFormValue<number>(name, {
		value,
		defaultValue: defaultValue ?? min,
		onValueChange: (next) => {
			if (next != null) onValueChange?.(next)
		},
	})

	const current = bound ?? min

	const setRef = useComposedRef(resetRef, ref)

	const percent = pct(current, min, max)

	// Resolves id/disabled/readOnly/describedby from a wrapping Control or Field, falling
	// back to a generated id (the same chain Input uses). A sibling <Label
	// htmlFor> (or a <Field><Label> with no explicit id) names the input via
	// this id. `required` is not resolved: a range input always has a value and
	// HTML constraint validation ignores the attribute; only invalid +
	// describedby carry meaning here.
	const controlProps = useControlProps({
		id,
		disabled,
		readOnly,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	const scope = useIdScope({ id: controlProps.id })

	return (
		<input
			type="range"
			data-slot="slider"
			data-density={size}
			ref={setRef}
			id={scope.id}
			disabled={controlProps.disabled}
			aria-describedby={controlProps['aria-describedby']}
			aria-readonly={ariaAttr(controlProps.readOnly)}
			{...invalidAttrs(controlProps.invalid)}
			min={min}
			max={max}
			step={step}
			name={name}
			aria-valuetext={getValueText?.(current)}
			value={current}
			// A native range input ignores `readonly`. React holds the value of the
			// input, so a change that the slider does not write goes back.
			onChange={(event) => {
				if (!controlProps.readOnly) setValue(Number(event.target.value))
			}}
			// The touched mark runs whatever the caller does (CONVENTIONS.md §3.9).
			onBlur={composeEventHandlers(onBlur, setTouched, { checkForDefaultPrevented: false })}
			className={cn(k({ color }), className)}
			style={{ ...style, '--slider-value': `${percent}%` } as CSSProperties}
			{...props}
		/>
	)
}
