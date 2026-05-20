import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { narabi } from '../../recipes'
import { disabled, field, type SwitchFieldVariants } from '../../recipes/kata/switch'

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, size, ...props }: SwitchFieldProps) {
	return (
		<div
			data-slot="field"
			className={cn(narabi.toggle, field({ size }), disabled, className)}
			{...props}
		/>
	)
}
