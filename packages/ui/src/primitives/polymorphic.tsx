import type React from 'react'
import { Link } from '../core'

/** Discriminated union — renders as a Link when `href` is provided, otherwise as the fallback element. */
export type PolymorphicProps<Fallback extends keyof React.JSX.IntrinsicElements> =
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<Fallback>, 'className'>)
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)

/** Renders as a Link when `href` is present, otherwise as the fallback intrinsic element. */
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
