'use client'

import { type ChangeEvent, type ComponentProps, useRef } from 'react'
import { ariaAttr, cn } from '../../core'
import { useComposedRef, useControllableFlag } from '../../hooks'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { useControlProps } from '../control/use-control-props'
import { useFormToggle } from '../form/use-form-toggle'

/** Props for {@link Switch}: the recipe `color` and the `size` step, an input `ref`, and native `<input>` attributes minus `type`/`size`. */
export type SwitchProps = SwitchVariants & {
	className?: string
	/**
	 * The initial state when uncontrolled.
	 * @defaultValue false
	 */
	defaultChecked?: boolean
	/**
	 * Keeps the state of the switch. A click or a Space press does not change it,
	 * and `onChange` does not fire. The switch keeps the focus, submits its value,
	 * and sets `aria-readonly`. When omitted, it takes the value of an enclosing
	 * `<Control>` or `<Field>`.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
} & Omit<ComponentProps<'input'>, 'className' | 'type' | 'size' | 'defaultChecked' | 'readOnly'>

/**
 * Toggle control backed by a native `role="switch"` checkbox; controlled via
 * `checked` or uncontrolled. Owns its checked state, keeping `aria-checked` in
 * sync. Integrates with enclosing `<Form>` and `<Control>` for binding and
 * validation. The track takes the step of the nearest density scope, and an
 * explicit `size` opens a scope on the label. An explicit `checked` prop wins over the bound field, and
 * `onChange` fires in either mode. `className`, `style`, and `hidden` go to the
 * visible track, and the other native attributes go to the input.
 */
export function Switch({
	className,
	style,
	hidden,
	color,
	size,
	id,
	disabled,
	readOnly,
	required,
	name,
	checked,
	defaultChecked,
	onChange,
	ref,
	'aria-describedby': ariaDescribedBy,
	...props
}: SwitchProps) {
	const {
		checked: resolvedChecked,
		onChange: resolvedOnChange,
		invalid,
	} = useFormToggle({ name, checked, onChange })

	// `role="switch"` requires `aria-checked` to track the live value. Owning
	// the state here keeps it in sync for controlled and uncontrolled usage.
	const [on, setOn] = useControllableFlag({
		value: resolvedChecked,
		defaultValue: defaultChecked,
	})

	// React-control the input only when a `checked` prop or form binding drives it.
	// Without one, rendering `checked={on}` makes the input perpetually
	// controlled and a native `<button type="reset">` cannot revert it.
	const isControlled = resolvedChecked !== undefined

	const inputRef = useRef<HTMLInputElement>(null)

	const setRef = useComposedRef(inputRef, ref)

	// A native form reset reverts the uncontrolled input without firing onChange;
	// mirror the reverted value into the owned aria state.
	useFormResetSync(inputRef, !isControlled, (input) => setOn(input.checked))

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		validation,
		'aria-describedby': resolvedDescribedBy,
	} = useControlProps({
		id,
		disabled,
		required,
		readOnly,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	// A read-only switch undoes the toggle and does not call the resolved handler.
	// The write goes through the setter, so the change tracker of React keeps the
	// correct value, as on Checkbox.
	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (resolvedReadOnly) {
			event.currentTarget.checked = !event.currentTarget.checked

			return
		}

		setOn(event.target.checked)

		resolvedOnChange?.(event)
	}

	return (
		<label
			data-slot="control"
			data-density={size}
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			hidden={hidden}
			style={style}
			className={cn(k({ color }), className)}
		>
			<input
				// Consumer props spread first; the switch role, the synced
				// aria-checked, the read-only state, the controlled wiring, and
				// data-slot below take precedence.
				{...props}
				type="checkbox"
				role="switch"
				data-slot="switch"
				ref={setRef}
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				{...(isControlled ? { checked: on } : { defaultChecked: defaultChecked ?? false })}
				aria-checked={on}
				aria-readonly={ariaAttr(resolvedReadOnly)}
				onChange={handleChange}
				aria-describedby={resolvedDescribedBy}
				{...validation}
				className={k.input()}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={k.thumb()} />
		</label>
	)
}
