'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn, invalidAttrs } from '../../core'
import { useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { kokkaku } from '../../recipes'
import {
	type SwitchVariants,
	switchInputVariants,
	switchThumbVariants,
	switchVariants,
} from '../../recipes/kata/switch'
import { useControlProps } from '../control/use-control-props'
import { useFormToggle } from '../form/context'
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
	...props
}: SwitchProps) {
	const binding = useFormToggle(name, { onChange })

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		invalid: resolvedInvalid,
	} = useControlProps({ id, disabled, required, binding })

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
