import type { ComponentPropsWithoutRef, ElementType, JSX, ReactNode, Ref } from 'react'
import { Link } from './link'

/** Discriminated union — renders as a Link when `href` is provided, otherwise as the fallback element. */
export type PolymorphicProps<Fallback extends keyof JSX.IntrinsicElements> =
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<Fallback>, 'className'>)
	| ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, 'className'>)

/** Renders as a Link when `href` is present, otherwise as the fallback intrinsic element. */
export function Polymorphic<Fallback extends keyof JSX.IntrinsicElements>({
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
	ref?: Ref<Element>
	dataSlot: string
	className: string
	children: ReactNode
} & Record<string, unknown>) {
	if (href !== undefined) {
		return (
			<Link
				data-slot={dataSlot}
				href={href}
				className={className}
				{...(rest as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
			>
				{children}
			</Link>
		)
	}

	const Element = as as ElementType

	return (
		<Element
			ref={ref}
			data-slot={dataSlot}
			type={as === 'button' ? 'button' : undefined}
			className={className}
			{...(rest as ComponentPropsWithoutRef<Fallback>)}
		>
			{children}
		</Element>
	)
}
