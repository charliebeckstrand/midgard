import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toggle'

/** Props for {@link ToggleGroup}: `role` plus the standard `div` attributes. */
export type ToggleGroupProps = {
	className?: string
	role?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'role'>

/**
 * Outer container for a set of toggleable fields, applying the shared group
 * layout. Pass `role` (e.g. `radiogroup`, `group`) to match the control type.
 */
export function ToggleGroup({ className, role, ...props }: ToggleGroupProps) {
	return <div data-slot="control" role={role} className={cn(k.group, className)} {...props} />
}

/** Props for {@link ToggleField}: the standard `div` attributes. */
export type ToggleFieldProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Single row inside a {@link ToggleGroup}, laying out one control alongside its
 * label.
 */
export function ToggleField({ className, ...props }: ToggleFieldProps) {
	return <div data-slot="field" className={cn(k.field, className)} {...props} />
}
