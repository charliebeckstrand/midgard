import type { ReactNode } from 'react'
import { cn } from '../../core'
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
 * Static leaf: renders in React Server Components. `size` is explicit
 * (recipe default `md`); prefix and suffix icons size through the badge's
 * own slot projection (`shaku.icon` in the kata size rows). Inside a control
 * affix slot, set `size` one step below the host control: the affix
 * compensation constants in `kiso/control/affix` assume the stepped-down
 * chip.
 */
export function Badge({
	variant = 'solid',
	color,
	size,
	rounded,
	className,
	children,
	href,
	render,
	prefix,
	suffix,
	...props
}: BadgeProps) {
	const resolvedSize = size ?? 'md'

	return (
		<PolymorphicStatic
			as="span"
			data-slot="badge"
			data-size={resolvedSize}
			data-has-prefix={!!prefix || undefined}
			data-has-suffix={!!suffix || undefined}
			href={href}
			render={render}
			className={cn(k({ variant, color, size: resolvedSize, rounded }), className)}
			{...props}
		>
			{prefix}
			{children}
			{suffix}
		</PolymorphicStatic>
	)
}
