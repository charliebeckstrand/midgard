'use client'

import type { ChangeEvent, ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useControllable } from '../../hooks'
import { useSkeleton } from '../../providers/skeleton'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { useControlToggle } from '../control/use-control-toggle'
import { useFormToggle } from '../form/use-form-toggle'
import { Placeholder } from '../placeholder'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/**
 * Toggle control backed by a native `role="switch"` checkbox — controlled via
 * `checked` or uncontrolled, owning its state so `aria-checked` always tracks
 * reality. Integrates with enclosing `<Form>` and `<Control>` for binding,
 * sizing, and validation.
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
	'aria-describedby': ariaDescribedBy,
	...props
}: SwitchProps) {
	const binding = useFormToggle(name, { onChange })

	// Own the checked state so `aria-checked` always reflects reality. A native
	// `role="switch"` checkbox exposes its state via the DOM `checked` property,
	// but `aria-checked` is required for the role and a static value would not
	// track uncontrolled toggles — assistive tech would announce a stale state.
	const [on, setOn] = useControllable<boolean>({
		value: binding ? binding.checked : checked,
		defaultValue: defaultChecked ?? false,
	})

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setOn(e.target.checked)

		if (binding) binding.onChange(e)
		else onChange?.(e)
	}

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
		binding,
	})

	if (useSkeleton()) {
		return (
			<Placeholder
				className={cn(k.skeleton.base, k.skeleton.size[resolvedSize ?? 'md'], className)}
			/>
		)
	}

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k({ size: resolvedSize, color }), className)}
		>
			<input
				type="checkbox"
				role="switch"
				data-slot="switch"
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				checked={on ?? false}
				aria-checked={on ?? false}
				onChange={handleChange}
				aria-describedby={resolvedDescribedBy}
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
				{...props}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={k.thumb()} />
		</label>
	)
}
