import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { type BadgeVariants, k } from '../../recipes/kata/badge'

type BadgeBaseProps = BadgeVariants & {
	className?: string
	/** Leading content (typically an icon), rendered before `children`. */
	prefix?: ReactNode
	/** Trailing content (typically an icon), rendered after `children`. */
	suffix?: ReactNode
}

/** Props for {@link Badge}; recipe variants plus prefix/suffix slots and the polymorphic `<span>`/`href`/`render` surface. */
export type BadgeProps = BadgeBaseProps & PolymorphicStaticProps<'span', 'prefix'>

/**
 * Compact label chip for status, counts, or tags, with optional `prefix`/`suffix`
 * icons. Polymorphic: renders a `<span>`, a plain anchor when `href` is set, or a
 * composed element via `render` (e.g. `render={<Link />}`) to wire the app router
 * link at the call site.
 *
 * @remarks
 * Static leaf: renders in React Server Components. Without `size`, the badge
 * takes the step of the nearest density scope, and `md` outside one. It reads
 * no context: the kata writes each step in a stepped `density-*` utility
 * of `ui/tailwind.css`. An explicit `size` makes the badge a density scope, so
 * the badge and its children take that step. Prefix and suffix icons size through the badge's
 * own slot projection. Inside a control affix slot, set `size` one step below
 * the host control: the affix compensation constants in `kiso/control/affix`
 * assume the stepped-down chip.
 */
export function Badge({
	variant = 'solid',
	color,
	size,
	radius,
	className,
	children,
	href,
	render,
	prefix,
	suffix,
	...props
}: BadgeProps) {
	return (
		<PolymorphicStatic
			as="span"
			data-slot="badge"
			density={size}
			data-has-prefix={dataAttr(!!prefix)}
			data-has-suffix={dataAttr(!!suffix)}
			href={href}
			render={render}
			className={cn(k({ variant, color, radius }), className)}
			{...props}
		>
			{prefix}
			{children}
			{suffix}
		</PolymorphicStatic>
	)
}
