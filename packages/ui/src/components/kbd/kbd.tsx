import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type KbdVariants, k } from '../../recipes/kata/kbd'

/** Props for {@link Kbd}: an optional `size` atop native `<kbd>` attributes. */
export type KbdProps = ComponentProps<'kbd'> & {
	/** The density step. Omit it to take the step of the nearest density scope. A step makes the key a density scope. */
	size?: KbdVariants['size']
}

/**
 * Keyboard-key glyph. Write a modifier as part of the children, in platform order (⌃⌘).
 *
 * @remarks
 * A pure, server-renderable display leaf. Without `size`, the key takes the
 * step of the nearest density scope, so a key in a Button takes the step of
 * the button. An explicit `size` makes the key a density scope.
 */
export function Kbd({ size, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" data-density={size} className={cn(k(), className)} {...props}>
			{children}
		</kbd>
	)
}
