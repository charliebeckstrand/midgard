import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type KbdVariants, k } from '../../recipes/kata/kbd'

/** Props for {@link Kbd}: an optional `size` atop native `<kbd>` attributes. */
export type KbdProps = ComponentProps<'kbd'> & {
	size?: KbdVariants['size']
}

// `size` resolves from the prop, else the `md` default of the recipe. Kbd is a
// pure, server-renderable display leaf and stays density-inert. A parent such
// as Button can still size its keys, because the default ranks below a step.
/** Keyboard-key glyph. Write a modifier as part of the children, in platform order (⌃⌘). */
export function Kbd({ size, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" className={cn(k({ size }), className)} {...props}>
			{children}
		</kbd>
	)
}
