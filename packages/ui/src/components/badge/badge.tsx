import type { ReactNode } from 'react'
import { cn } from '../../core'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { type BadgeVariants, k } from '../../recipes/kata/badge'

type BadgeBaseProps = BadgeVariants & {
	className?: string
	prefix?: ReactNode
	suffix?: ReactNode
}

export type BadgeProps = BadgeBaseProps & PolymorphicStaticProps<'span', 'prefix'>

/**
 * Static leaf: no directive, no context reads, renders in React Server
 * Components. `size` is explicit and defaults to the recipe's `md`; prefix and
 * suffix icons size through the badge's own slot projection (`shaku.icon` in
 * the kata size rows). Inside a control affix slot, set `size` one step below
 * the host control: the affix compensation constants in `kiso/control/affix`
 * assume the stepped-down chip.
 *
 * `href` renders a plain anchor; pass `render` (e.g. `render={<Link />}`) to
 * compose the app router link at the call site.
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
