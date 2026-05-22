import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type SwitchFieldVariants } from '../../recipes/kata/switch'

export type SwitchFieldProps = SwitchFieldVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function SwitchField({ className, size, ...props }: SwitchFieldProps) {
	return (
		<div data-slot="field" className={cn(k.field({ size }), k.disabled, className)} {...props} />
	)
}
