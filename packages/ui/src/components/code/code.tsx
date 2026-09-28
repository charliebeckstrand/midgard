import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type CodeVariants, k } from '../../recipes/kata/code'

/** Props for {@link Code}. */
export type CodeProps = ComponentProps<'code'> & {
	size?: CodeVariants['size']
}

// `size` resolves from the prop or the recipe default only. Inline Code stays
// density-inert: it follows no density scope.
/**
 * Inline monospace `<code>` span; `size` selects the type scale, resolving
 * against the recipe default when omitted.
 *
 * @remarks
 * A pure server-renderable display leaf: it stays density-inert and reads no
 * context, so it carries no `'use client'` boundary.
 */
export function Code({ className, size, ...props }: CodeProps) {
	return <code data-slot="code" className={cn(k({ size }), className)} {...props} />
}
