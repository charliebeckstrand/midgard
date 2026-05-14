'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useConcentric } from '../../primitives'
import { kokkaku } from '../../recipes'
import {
	type SwitchVariants,
	switchInputVariants,
	switchThumbVariants,
	switchVariants,
} from '../../recipes/kata/switch'
import { useControl } from '../control/context'
import { invalidAttrs } from '../control/control-invalid-attrs'
import { useControlFieldProps } from '../control/use-control-field-props'
import { useFormToggle } from '../form/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'

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
	...props
}: SwitchProps) {
	const concentric = useConcentric()
	const control = useControl()

	const binding = useFormToggle(name, { onChange })

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		invalid: resolvedInvalid,
	} = useControlFieldProps({ id, disabled, required, binding })

	// Resolution order: explicit prop, then any wrapping <Field> control
	// context, then the ambient concentric size.
	const resolvedSize = size ?? control?.size ?? concentric?.size ?? 'md'

	if (useSkeleton()) {
		return (
			<Placeholder
				className={cn(kokkaku.switch.base, kokkaku.switch.size[resolvedSize ?? 'md'], className)}
			/>
		)
	}

	return (
		<label
			data-slot="control"
			{...(resolvedDisabled ? { 'data-disabled': true } : {})}
			className={cn(switchVariants({ size: resolvedSize, color }), className)}
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
				{...invalidAttrs(resolvedInvalid)}
				className={switchInputVariants()}
				{...props}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={switchThumbVariants()} />
		</label>
	)
}
