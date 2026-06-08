import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type KbdVariants, k } from '../../recipes/kata/kbd'

export type KbdProps = ComponentPropsWithoutRef<'kbd'> & {
	size?: KbdVariants['size']
	/** Prepend the Command (⌘) modifier glyph. */
	command?: boolean
	/** Prepend the Control (⌃) modifier glyph. */
	control?: boolean
}

/** Keyboard-key glyph — optionally prepends the Command (`command`) or Control (`control`) modifier symbol. */
export function Kbd({ command, control, size, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" className={cn(k({ size }), className)} {...props}>
			{command && <span>⌘</span>}
			{control && <span>⌃</span>}
			{children}
		</kbd>
	)
}
