'use client'

import { cn } from '../../core'
import { kokkaku, narabi } from '../../recipes'
import { useControl } from '../control/context'
import { useFormToggle } from '../form/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import {
	k,
	type SwitchFieldVariants,
	type SwitchVariants,
	switchColorVariants,
	switchFieldVariants,
	switchInputVariants,
	switchThumbVariants,
	switchVariants,
} from './variants'

export type SwitchProps = SwitchVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>

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
	const control = useControl()
	const binding = useFormToggle(name, { onChange })

	const resolvedId = id ?? control?.id
	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedSize = size ?? (control?.size as SwitchVariants['size'])

	const resolvedInvalid = control?.invalid || binding?.invalid

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
			className={cn(
				k.wrapper,
				switchVariants({ size: resolvedSize }),
				switchColorVariants({ color }),
				className,
			)}
		>
			<input
				type="checkbox"
				data-slot="switch"
				id={resolvedId}
				name={name}
				disabled={resolvedDisabled}
				required={resolvedRequired}
				checked={binding?.checked ?? checked}
				onChange={binding?.onChange ?? onChange}
				{...(resolvedInvalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
				className={switchInputVariants()}
				{...props}
			/>
			<span data-slot="switch-thumb" aria-hidden="true" className={switchThumbVariants()} />
		</label>
	)
}

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, size, ...props }: SwitchFieldProps) {
	return (
		<div
			data-slot="field"
			className={cn(narabi.toggle, switchFieldVariants({ size }), k.disabled, className)}
			{...props}
		/>
	)
}
