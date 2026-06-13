import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type CodeVariants, k } from '../../recipes/kata/code'

/** Props for {@link Code}. */
export type CodeProps = ComponentPropsWithoutRef<'code'> & {
	size?: CodeVariants['size']
}

// `size` resolves from the prop or the recipe default only. Inline Code is a
// pure, server-renderable display leaf and stays density-inert; reading
// ambient Density requires `'use client'`.
/**
 * Inline monospace `<code>` span; `size` selects the type scale, resolving
 * against the recipe default when omitted.
 *
 * @remarks
 * A pure server-renderable display leaf: it stays density-inert and never reads
 * ambient Density, so it carries no `'use client'` boundary.
 */
export function Code({ className, size, ...props }: CodeProps) {
	return <code data-slot="code" className={cn(k({ size }), className)} {...props} />
}
