import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type TextVariants } from '../../recipes/kata/text'

/** Props for {@link Text}: the `severity`/`color` recipe axes plus the native `<p>` surface. */
export type TextProps = TextVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'color'>

/**
 * Paragraph text styled by `severity` and `color` from the text recipe. Static
 * leaf: renders in React Server Components. Compose `<TextSkeleton>` in the
 * loading tree for a placeholder.
 */
export function Text({ severity, color, className, ...props }: TextProps) {
	return <p data-slot="text" className={cn(k({ severity, color }), className)} {...props} />
}
