'use client'

import type { ChangeEventHandler, ComponentProps } from 'react'
import { cn } from '../../core'
import { k, type RadioVariants } from '../../recipes/kata/radio'
import { useControlProps } from '../control/use-control-props'
import { useRadioGroupReadOnly } from './context'

/** Props for {@link Radio}: the recipe `color` and the `size` step, plus native `<input>` attributes (less `type`/`size`). */
export type RadioProps = RadioVariants & {
	/**
	 * Keeps the radio as it is. A click, a Space press, or an arrow key does not
	 * check it, and `onChange` does not fire. The radio keeps the focus, and it
	 * submits its value when it is checked. It does not set `aria-readonly`,
	 * because ARIA defines it on the group. When omitted, it takes the value of
	 * an enclosing `<Control>` or `<Field>`. A radio in a read-only
	 * {@link RadioGroup} is read-only too.
	 * @defaultValue `false`, or the state of the enclosing Control, or `true` in a read-only RadioGroup.
	 */
	readOnly?: boolean
	className?: string
} & Omit<ComponentProps<'input'>, 'className' | 'type' | 'size' | 'readOnly'>

/**
 * Single radio control wrapped in its label; id, disabled, required, readOnly,
 * and invalid state resolve from the enclosing Control. A read-only
 * {@link RadioGroup} also makes the radio read-only. The circle takes the step
 * of the nearest density scope, and an explicit `size` opens a scope on the
 * label.
 *
 * @remarks Unlike {@link Checkbox} and {@link Switch}, this binds no Form
 * field. It has no internal checked state, and stays a native input controlled
 * by `checked`/`defaultChecked` and a shared `name`. Group radios with
 * {@link RadioGroup} and a common `name` for single-selection.
 *
 * `name` here is the native grouping name, not the CONVENTIONS §7.2 value
 * binding it carries on Checkbox and Switch. A radio group is one value across
 * N inputs, not a boolean per input, so no per-radio binding is correct. Inside
 * a Form, hold the group's value in the form field and drive each radio's
 * `checked` from it.
 */
export function Radio({
	className,
	color,
	size,
	id,
	disabled,
	readOnly,
	required,
	ref,
	onChange,
	'aria-describedby': ariaDescribedBy,
	...props
}: RadioProps) {
	const groupReadOnly = useRadioGroupReadOnly()

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		validation,
		'aria-describedby': resolvedDescribedBy,
	} = useControlProps({ id, disabled, required, readOnly, 'aria-describedby': ariaDescribedBy })

	// A read-only radio undoes the check and does not call the consumer handler.
	// The write goes through the setter, so the change tracker of React keeps the
	// correct value, as on Checkbox. The click also cleared the old radio of the
	// group, and the radio cannot know which one it was. So the handler also
	// cancels the click, because the change event of a radio comes from its
	// click. The browser then checks the old radio again, and React does the same
	// for a controlled group.
	//
	// In an uncontrolled group, React reads the old radio before the browser
	// checks it again. A later click on that checked radio then fires one extra
	// `onChange`.
	const handleChange: ChangeEventHandler<HTMLInputElement> | undefined =
		resolvedReadOnly || groupReadOnly
			? (event) => {
					event.currentTarget.checked = false

					event.preventDefault()
				}
			: onChange

	return (
		<label
			data-slot="control"
			data-density={size}
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k({ color }), className)}
		>
			<input
				// Consumer props spread first; `type`, the native grouping `name`,
				// the read-only guard, the validation attributes, and data-slot
				// below take precedence. Radio carries no §7.2 value binding — see
				// the remarks above.
				{...props}
				type="radio"
				data-slot="radio"
				ref={ref}
				id={resolvedId}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				onChange={handleChange}
				aria-describedby={resolvedDescribedBy}
				{...validation}
				className={k.input()}
			/>
			<span data-slot="radio-indicator" aria-hidden="true" className={k.indicator()} />
		</label>
	)
}
