import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/placeholder'

/** Props for {@link Placeholder}: native `<div>` attributes. */
export type PlaceholderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Pulsing skeleton shape. Renders a line by default; pass `className` for
 * other shapes.
 * @remarks Static leaf: renders in React Server Components.
 * @remarks To join adjacent placeholders like grouped controls, stamp
 * `data-group` / `data-group-orientation` explicitly; they pass through to the
 * element and match the group's container-scoped `tsunagi` join selectors.
 */
export function Placeholder({ className, ...props }: PlaceholderProps) {
	return (
		<div data-slot="placeholder" aria-hidden="true" className={cn(k.base, className)} {...props} />
	)
}
