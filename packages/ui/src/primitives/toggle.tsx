import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../core'
import { narabi } from '../recipes'

export type ToggleGroupProps = {
	className?: string
	role?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'role'>

/** Outer wrapper for a group of toggleable fields — applies the shared `narabi.group` layout. */
export function ToggleGroup({ className, role, ...props }: ToggleGroupProps) {
	return <div data-slot="control" role={role} className={cn(narabi.group, className)} {...props} />
}

export type ToggleFieldProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Row inside a `ToggleGroup` — pairs a single control with its label via the `narabi.toggle` recipe. */
export function ToggleField({ className, ...props }: ToggleFieldProps) {
	return <div data-slot="field" className={cn(narabi.toggle, className)} {...props} />
}
