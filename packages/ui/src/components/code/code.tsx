import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type CodeVariants, k } from '../../recipes/kata/code'

/** Props for {@link Code}. */
export type CodeProps = ComponentProps<'code'> & {
	/** The density step. Omit it to take the step of the nearest density scope. A step makes the mark a density scope. */
	size?: CodeVariants['size']
}

/**
 * Inline monospace `<code>` span. Without `size`, the mark takes the step of
 * the nearest density scope. An explicit `size` makes the mark a density scope.
 *
 * @remarks
 * A pure server-renderable display leaf: it reads no context, so it carries no
 * `'use client'` boundary. The kata writes each step in a stepped `density-*`
 * utility.
 */
export function Code({ className, size, ...props }: CodeProps) {
	return <code data-slot="code" data-density={size} className={cn(k(), className)} {...props} />
}
