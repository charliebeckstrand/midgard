'use client'

import type { ChangeEventHandler, ComponentProps } from 'react'
import { cn } from '../../core'
import { k, type RadioVariants } from '../../recipes/kata/radio'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useRadioGroup } from './context'

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
} & Omit<ComponentProps<'input'>, 'type' | 'size' | 'readOnly'>

/**
 * Single radio control wrapped in its label; id, disabled, required, readOnly,
 * and invalid state resolve from the enclosing Control. A read-only
 * {@link RadioGroup} also makes the radio read-only. In a RadioGroup, the radio
 * does not adopt the id or the description of a `<Field>` or `<Control>` that
 * holds the group; wrap it in a {@link RadioField} to give it an id. The
 * circle takes the step of the nearest density scope, and an explicit `size`
 * opens a scope on the label.
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
	const group = useRadioGroup()

	const groupReadOnly = group.readOnly

	// A bare radio of a group in a `<Field>` sees the Control of the Field. The
	// id and the description of that Control are for the group, so the radio
	// keeps only its own. Two radios with the Field id would share one id. It
	// still takes `disabled`, `required`, `readOnly`, and the validation state,
	// because those apply to each radio of the group. A `<RadioField>` in the
	// group gives a different id, so its radio takes all of its Control.
	const controlId = useControl()?.id

	const groupField = controlId !== undefined && controlId === group.fieldId

	const {
		id: controlledId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		validation,
		'aria-describedby': controlledDescribedBy,
	} = useControlProps({
		id: groupField ? undefined : id,
		disabled,
		required,
		readOnly,
		'aria-describedby': ariaDescribedBy,
	})

	const resolvedId = groupField ? id : controlledId

	const resolvedDescribedBy = groupField ? ariaDescribedBy : controlledDescribedBy

	// A read-only radio undoes the check and does not call the consumer handler.
	// The write goes through the setter, so the change tracker of React keeps the
	// correct value, as on Checkbox. The click also cleared the old radio of the
	// group, and the radio cannot know which one it was. So the handler also
	// cancels the click, because the change event of a radio comes from its
	// click. The browser then checks the old radio again, and React does the same
	// for a controlled group.
	//
	// In an uncontrolled group, React reads the old radio before the browser
	// checks it again, so the change tracker of React records it as clear. The
	// browser restore does not go through the setter. So after the click task,
	// the handler writes each checked radio of the group through the setter
	// again. A later click on the old radio then fires no `onChange`.
	//
	// A click that an `onClick` cancels gets the same undo. React reads the check
	// before the browser restores the group, so it sends a change that does not
	// occur. The `onClick` handlers run before this handler, so the click event
	// shows the cancel. The wrapper attaches only while the radio is read-only or
	// has a handler. React then keeps its warning for a `checked` radio with no
	// `onChange`.
	const readOnlyRadio = resolvedReadOnly || groupReadOnly

	const handleChange: ChangeEventHandler<HTMLInputElement> | undefined =
		readOnlyRadio || onChange
			? (event) => {
					if (readOnlyRadio || event.nativeEvent.defaultPrevented) {
						const input = event.currentTarget

						input.checked = false

						event.preventDefault()

						if (input.name) {
							setTimeout(() => {
								const group = input.getRootNode() as ParentNode

								const selector = `input[type="radio"][name="${CSS.escape(input.name)}"]:checked`

								for (const radio of group.querySelectorAll<HTMLInputElement>(selector)) {
									radio.checked = true
								}
							})
						}

						return
					}

					onChange?.(event)
				}
			: undefined

	const slots = k({ color })

	return (
		<label
			data-slot="control"
			data-density={size}
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(slots.base, className)}
		>
			<input
				// Consumer props spread first; `type`, the native grouping `name`,
				// the read-only guard, the validation attributes, and data-slot
				// below take precedence. Radio carries no §7.2 value binding (see
				// the remarks above).
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
				className={slots.input}
			/>
			<span data-slot="radio-indicator" aria-hidden="true" className={slots.indicator} />
		</label>
	)
}
