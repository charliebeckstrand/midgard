import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

/** Props for {@link Spacer}: an optional `className` plus `<div>` attributes (children excluded). */
export type SpacerProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

/**
 * Flexible gap that expands to consume free space inside a flex container,
 * pushing siblings to opposite ends. Renders an `aria-hidden` `flex-1`
 * `<div>` that stretches on the cross axis; takes no children. A static leaf
 * with no client hooks, so it renders in React Server Components.
 */
export function Spacer({ className, ...props }: SpacerProps) {
	return (
		<div
			data-slot="spacer"
			aria-hidden="true"
			className={cn('flex-1 self-stretch', className)}
			{...props}
		/>
	)
}
