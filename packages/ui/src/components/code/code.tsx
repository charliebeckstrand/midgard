import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type CodeVariants, k } from '../../recipes/kata/code'

export type CodeProps = ComponentPropsWithoutRef<'code'> & {
	size?: CodeVariants['size']
}

/** Inline monospace code span — `size` selects the type scale. */
export function Code({ className, size, ...props }: CodeProps) {
	return <code data-slot="code" className={cn(k({ size }), className)} {...props} />
}
