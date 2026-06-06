import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type KbdVariants, k } from '../../recipes/kata/kbd'

export type KbdProps = ComponentPropsWithoutRef<'kbd'> & {
	size?: KbdVariants['size']
	/** Prepend the Command (⌘) modifier glyph. */
	cmd?: boolean
	/** Prepend the Control (⌃) modifier glyph. */
	ctrl?: boolean
}

/** Keyboard-key glyph — optionally prepends the Command (`cmd`) or Control (`ctrl`) modifier symbol. */
export function Kbd({ cmd, ctrl, size, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" className={cn(k({ size }), className)} {...props}>
			{cmd && <span>⌘</span>}
			{ctrl && <span>⌃</span>}
			{children}
		</kbd>
	)
}
