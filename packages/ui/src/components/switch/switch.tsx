'use client'

import type { ChangeEvent, ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useControllable } from '../../hooks'
import { useSkeleton } from '../../providers/skeleton'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { useControlToggle } from '../control/use-control-toggle'
import { useFormToggle } from '../form/use-form-toggle'
import { SwitchSkeleton } from './switch-skeleton'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

/**
 * Toggle control backed by a native `role="switch"` checkbox — controlled via
 * `checked` or uncontrolled. Owns its checked state so `aria-checked` stays in
 * sync. Integrates with enclosing `<Form>` and `<Control>` for binding,
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

	// `aria-checked` is required by `role="switch"` and must track the live value.
	// Owning the state here keeps it in sync for both controlled and uncontrolled usage.
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
		return <SwitchSkeleton size={size} className={className} />
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
