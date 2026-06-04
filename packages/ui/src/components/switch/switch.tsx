'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { useControlToggle } from '../control/use-control-toggle'
import { useFormToggle } from '../form/use-form-toggle'
import { Placeholder } from '../placeholder'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

export function Switch({
	className,
	color,
	size,
	id,
	disabled,
	required,
	name,
	checked,
	onChange,
	'aria-describedby': ariaDescribedBy,
	...props
}: SwitchProps) {
	const binding = useFormToggle(name, { onChange })

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
				checked={binding?.checked ?? checked}
				aria-checked={!!(binding?.checked ?? checked)}
				onChange={binding?.onChange ?? onChange}
				aria-describedby={resolvedDescribedBy}
				{...invalidAttrs(resolvedInvalid)}
				className={k.input()}
				{...props}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={k.thumb()} />
		</label>
	)
}
