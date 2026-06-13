import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type DividerVariants, k } from '../../recipes/kata/divider'

/** Props for {@link Divider}: `orientation`/`soft` variants plus native `<hr>` attributes. */
export type DividerProps = DividerVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'hr'>, 'className'>

/**
 * Thin rule that separates content, rendered as a styled `<hr>`. Draws a top border when
 * `horizontal` and a left border when `vertical`, and lightens the line under `soft`.
 *
 * @remarks
 * The `vertical` orientation adds `role="separator"` and `aria-orientation="vertical"` for
 * assistive tech; the default horizontal rule relies on the native `<hr>` semantics.
 *
 * @defaultValue orientation 'horizontal', soft false
 */
export function Divider({ orientation, soft, className, ...props }: DividerProps) {
	return (
		<hr
			data-slot="divider"
			role={orientation === 'vertical' ? 'separator' : undefined}
			aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
			className={cn(k({ orientation, soft }), className)}
			{...props}
		/>
	)
}
