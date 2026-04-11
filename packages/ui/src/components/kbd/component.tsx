import type React from 'react'
import { cn } from '../../core'
import { kbdVariants } from './variants'

export type KbdProps = React.ComponentPropsWithoutRef<'kbd'> & {
	/** Prepend the Command (⌘) modifier glyph. */
	cmd?: boolean
	/** Prepend the Control (⌃) modifier glyph. */
	ctrl?: boolean
}

export function Kbd({ cmd, ctrl, className, children, ...props }: KbdProps) {
	return (
		<kbd data-slot="kbd" className={cn(kbdVariants(), className)} {...props}>
			{ctrl && <span>⌃</span>}
			{cmd && <span>⌘</span>}
			{children}
		</kbd>
	)
}
