import type React from 'react'
import { cn } from '../../core'
import { type KbdVariants, kbdVariants } from './variants'

export type KbdProps = React.ComponentPropsWithoutRef<'kbd'> & {
	size?: KbdVariants['size']
	/** Prepend the Command (⌘) modifier glyph. */
	cmd?: boolean
	/** Prepend the Control (⌃) modifier glyph. */
	ctrl?: boolean
}

export function Kbd({ cmd, ctrl, size, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" className={cn(kbdVariants({ size }), className)} {...props}>
			{cmd && <span>⌘</span>}
			{ctrl && <span>⌃</span>}
			{children}
		</kbd>
	)
}
