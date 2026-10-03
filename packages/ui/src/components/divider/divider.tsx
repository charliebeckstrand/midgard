import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { type DividerVariants, k } from '../../recipes/kata/divider'

/** Props for {@link Divider}: `orientation`/`soft` variants plus native `<hr>` attributes. */
export type DividerProps = DividerVariants & {
	className?: string
} & Omit<ComponentProps<'hr'>, 'className'>

/**
 * Thin rule that separates content, rendered as a styled `<hr>`. Draws a top
 * border when `horizontal` (default) and a left border when `vertical`. It
 * lightens the line under `soft` (default false).
 *
 * @remarks
 * The rule keeps the implicit `separator` role of the native `<hr>`. The
 * component drops a consumer `role`, so no role can replace it. The `vertical`
 * orientation adds `aria-orientation="vertical"` for assistive tech. That
 * attribute is load-bearing and is written after the spread. The root stamps `data-orientation`, the axis marker
 * every oriented container in the library carries. The `data-slot` anchor stays renameable, so a
 * wrapper such as `ToolbarSeparator` can re-anchor the rule
 * ([CONVENTIONS.md](CONVENTIONS.md) §3.9).
 */
export function Divider({
	orientation = 'horizontal',
	soft,
	className,
	role: _role,
	...props
}: DividerProps) {
	return (
		<hr
			data-slot="divider"
			data-orientation={orientation}
			className={cn(k({ orientation, soft }), className)}
			// Consumer props spread first; the orientation below takes precedence.
			{...props}
			aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
		/>
	)
}
