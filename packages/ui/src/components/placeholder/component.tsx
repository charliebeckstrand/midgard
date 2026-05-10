import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/placeholder'

export type PlaceholderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/** Pulsing skeleton shape. Defaults to a line; pass className for other shapes. */
export function Placeholder({ className, ...props }: PlaceholderProps) {
	return (
		<div data-slot="placeholder" aria-hidden="true" className={cn(k.base, className)} {...props} />
	)
}
