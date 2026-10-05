import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { type CodeVariants, k } from '../../recipes/kata/code'

/** Props for {@link Code}. */
export type CodeProps = ComponentProps<'code'> & {
	size?: CodeVariants['size']
}

/**
 * Inline monospace `<code>` span. Without `size`, the mark takes the step of
 * the nearest density scope. An explicit `size` makes the mark a density scope.
 *
 * @remarks
 * A pure server-renderable display leaf: it reads no context, so it carries no
 * `'use client'` boundary. The kata writes each step in a stepped `density-*`
 * utility. The scope of an explicit `size` also opens the density context
 * around the children, so a client descendant, such as a portal, takes the
 * same step.
 */
export function Code({ className, size, children, ...props }: CodeProps) {
	return (
		<PolymorphicStatic
			as="code"
			data-slot="code"
			density={size}
			className={cn(k(), className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
