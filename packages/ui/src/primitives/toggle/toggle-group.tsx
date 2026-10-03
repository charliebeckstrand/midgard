import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toggle'

/** Props for {@link ToggleGroup}: `role` plus the standard `div` attributes. */
export type ToggleGroupProps = ComponentProps<'div'>

/**
 * Outer container for a set of toggleable fields, applying the shared group
 * layout. Pass `role` (e.g. `radiogroup`, `group`) to match the control type.
 */
export function ToggleGroup({ className, role, ...props }: ToggleGroupProps) {
	return <div data-slot="control" className={cn(k.group, className)} {...props} role={role} />
}
