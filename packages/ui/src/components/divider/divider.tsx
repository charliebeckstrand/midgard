import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type DividerVariants, k } from '../../recipes/kata/divider'

/** Props for {@link Divider}: `orientation`/`soft` variants plus native `<hr>` attributes. */
export type DividerProps = DividerVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'hr'>, 'className'>

/**
 * Thin rule that separates content, rendered as a styled `<hr>`. Draws a top
 * border when `horizontal` (default) and a left border when `vertical`, and
 * lightens the line under `soft` (default false).
 *
 * @remarks
 * The `vertical` orientation adds `role="separator"` and
 * `aria-orientation="vertical"` for assistive tech; the default horizontal
 * rule relies on the native `<hr>` semantics.
 */
export function Divider({ orientation, soft, className, ...props }: DividerProps) {
	return (
		<hr
			// No library selector reads this anchor, so it stays above the spread
			// and ToolbarSeparator can re-anchor the rule (CONVENTIONS.md §3.9).
			data-slot="divider"
			className={cn(k({ orientation, soft }), className)}
			// Consumer props spread first; the separator semantics below take
			// precedence.
			{...props}
			role={orientation === 'vertical' ? 'separator' : undefined}
			aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
		/>
	)
}
