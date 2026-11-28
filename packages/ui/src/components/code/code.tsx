import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { type CodeVariants, k } from '../../recipes/kata/code'

/** Props for {@link Code}. */
export type CodeProps = ComponentProps<'code'> & {
	/** The density step. Omit it to take the step of the nearest density scope. A step makes the mark a density scope. */
	size?: CodeVariants['size']
}

/**
 * A span of inline code in a monospace font, as a `<code>` element. Without
 * `size`, the mark takes the step of the nearest density scope. An explicit
 * `size` makes the mark a density scope.
 *
 * @remarks
 * A pure server-renderable display leaf: it reads no context, so it carries no
 * `'use client'` boundary. The kata writes each step in a stepped `density-*`
 * utility. The scope of an explicit `size` also opens the density context
 * around the children, so a client descendant, such as a portal, takes the
 * same step.
 *
 * The mark is left-to-right text with `dir="ltr"`, which also isolates it from
 * the text around it. Thus `foo()` in a right-to-left paragraph does not show
 * as `()foo`. Pass `dir` to change it.
 *
 * The mark has the default text color, and not the color of the text around
 * it. Its fill lowers the contrast of its text, and muted or intent text on the
 * fill is below 4.5:1 (WCAG 1.4.3). On a solid fill, such as that of a solid
 * Button or Badge, the mark keeps the text color of the fill.
 */
export function Code({ className, size, children, ...props }: CodeProps) {
	return (
		<PolymorphicStatic
			as="code"
			data-slot="code"
			dir="ltr"
			density={size}
			className={cn(k().base, className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
