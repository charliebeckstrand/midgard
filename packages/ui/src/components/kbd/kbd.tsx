import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { type KbdVariants, k } from '../../recipes/kata/kbd'
import { hasTextLabel } from '../button/button-utilities'

/** Props for {@link Kbd}: an optional `size` atop native `<kbd>` attributes. */
export type KbdProps = ComponentProps<'kbd'> & {
	/** The density step. Omit it to take the step of the nearest density scope. A step makes the key a density scope. */
	size?: KbdVariants['size']
}

/**
 * Keyboard-key glyph. Write a modifier as part of the children, in platform order (⌃⌘).
 * A key with only an icon, such as `<Kbd><Icon icon={<CornerDownLeft />} /></Kbd>`,
 * is a square as tall as a key with text.
 *
 * @remarks
 * A pure, server-renderable display leaf. Without `size`, the key takes the
 * step of the nearest density scope, so a key in a Button takes the step of
 * the button. An explicit `size` makes the key a density scope.
 */
export function Kbd({ size, className, children, ...props }: KbdProps) {
	return (
		<kbd
			data-slot="kbd"
			data-density={size}
			// A key with only icons is a square (see `kata/kbd.ts`).
			data-has-label={hasTextLabel(children) || undefined}
			className={cn(k().base, className)}
			{...props}
		>
			{children}
		</kbd>
	)
}
