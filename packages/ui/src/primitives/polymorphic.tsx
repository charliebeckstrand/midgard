import type React from 'react'
import { Link } from '../core'

/**
 * Discriminated union for components that render as either an interactive
 * element (button, span, etc.) or a Link when `href` is provided.
 *
 * Usage:
 * ```ts
 * type ButtonProps = BaseProps & PolymorphicProps<'button'>
 * type BadgeProps  = BaseProps & PolymorphicProps<'span'>
 * ```
 */
export type PolymorphicProps<Fallback extends keyof React.JSX.IntrinsicElements> =
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<Fallback>, 'className'>)
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)

/**
 * Renders children as a Link or a fallback element based on the presence of `href`.
 *
 * Extracts `href` from props, renders the appropriate element, and spreads
 * remaining props onto it. Keeps the polymorphic branching in one place.
 */
export function Polymorphic<Fallback extends keyof React.JSX.IntrinsicElements>({
	as,
	href,
	ref,
	dataSlot,
	className,
	children,
	...rest
}: {
	as: Fallback
	href: string | undefined
	ref?: React.Ref<Element>
	dataSlot: string
	className: string
	children: React.ReactNode
} & Record<string, unknown>) {
	if (href !== undefined) {
		return (
			<Link
				data-slot={dataSlot}
				href={href}
				className={className}
				{...(rest as Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
			>
				{children}
			</Link>
		)
	}

	const Element = as as React.ElementType

	return (
		<Element
			ref={ref}
			data-slot={dataSlot}
			type={as === 'button' ? 'button' : undefined}
			className={className}
			{...(rest as React.ComponentPropsWithoutRef<Fallback>)}
		>
			{children}
		</Element>
	)
}
