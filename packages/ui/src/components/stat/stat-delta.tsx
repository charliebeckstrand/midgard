import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type StatDeltaVariants } from '../../recipes/kata/stat'

/** Props for {@link StatDelta}: the `trend` variant plus `<div>` attributes. */
export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Period-over-period change indicator, tinted by `trend` (up/down/flat). Static
 * leaf: renders in React Server Components. Compose `<StatDeltaSkeleton>` in the
 * loading tree.
 *
 * @remarks `trend` sets colour only; pair it with a textual sign or arrow in
 * `children` (e.g. `+12%`, `↓ 3`) so direction isn't conveyed by colour alone
 * (WCAG 1.4.1).
 */
export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	return (
		<div data-slot="stat-delta" className={cn(k.delta({ trend }), className)} {...props}>
			{children}
		</div>
	)
}
