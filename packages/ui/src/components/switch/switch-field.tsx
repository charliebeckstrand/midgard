import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { narabi } from '../../recipes'
import { k, type SwitchFieldVariants, switchFieldVariants } from './variants'

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, size, ...props }: SwitchFieldProps) {
	return (
		<div
			data-slot="field"
			className={cn(narabi.toggle, switchFieldVariants({ size }), k.disabled, className)}
			{...props}
		/>
	)
}
