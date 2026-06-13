'use client'

import { type ChangeEvent, type ComponentPropsWithoutRef, type Ref, useEffect, useRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useComposedRef, useControllable } from '../../hooks'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { useControlToggle } from '../control/use-control-toggle'
import { useFormToggle } from '../form/use-form-toggle'

/** Props for {@link Switch}: recipe variants (`color`, `size`), an input `ref`, and native `<input>` attributes minus `type`/`size`. */
export type SwitchProps = SwitchVariants & {
	className?: string
	ref?: Ref<HTMLInputElement>
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/**
 * Toggle control backed by a native `role="switch"` checkbox; controlled via
 * `checked` or uncontrolled. Owns its checked state, keeping `aria-checked` in
 * sync. Integrates with enclosing `<Form>` and `<Control>` for binding,
 * sizing, and validation; an explicit `checked` prop wins over the bound
 * field, and `onChange` fires in either mode.
 */
export function Switch({
	className,
	color,
	size,
	id,
	disabled,
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
	const [on, setOn] = useControllable<boolean>({
		value: resolvedChecked,
		defaultValue: defaultChecked ?? false,
	})

	// React-control the input only when a `checked` prop or form binding drives it.
	// Without one, rendering `checked={on}` makes the input perpetually
	// controlled and a native `<button type="reset">` cannot revert it.
	const isControlled = resolvedChecked !== undefined

	const inputRef = useRef<HTMLInputElement>(null)

	const setRef = useComposedRef(inputRef, ref)

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setOn(e.target.checked)

		resolvedOnChange?.(e)
	}

	// A native form reset reverts the uncontrolled input without firing onChange;
	// mirror the reverted value into the owned aria state on the next frame.
	useEffect(() => {
		if (isControlled) return

		const input = inputRef.current

		const form = input?.form

		if (!form) return

		const handleReset = () => requestAnimationFrame(() => setOn(input.checked))

		form.addEventListener('reset', handleReset)

		return () => form.removeEventListener('reset', handleReset)
	}, [isControlled, setOn])

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		invalid: resolvedInvalid,
		size: resolvedSize,
		'aria-describedby': resolvedDescribedBy,
	} = useControlToggle({
		id,
		disabled,
		required,
		size,
		'aria-describedby': ariaDescribedBy,
		invalid,
	})

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k({ size: resolvedSize, color }), className)}
		>
			<input
				// Consumer props spread first; the switch role, the synced
				// aria-checked, the controlled wiring, and data-slot below take
				// precedence.
				{...props}
				type="checkbox"
				role="switch"
				data-slot="switch"
				ref={setRef}
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				{...(isControlled ? { checked: on ?? false } : { defaultChecked: defaultChecked ?? false })}
				aria-checked={on ?? false}
				onChange={handleChange}
				aria-describedby={resolvedDescribedBy}
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={k.thumb()} />
		</label>
	)
}
