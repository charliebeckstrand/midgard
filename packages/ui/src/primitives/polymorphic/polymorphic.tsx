'use client'

import type { ComponentPropsWithoutRef, ElementType, JSX, ReactNode, Ref } from 'react'
import { type LinkProps, useLink } from '../link'

/** Props for `Polymorphic` — strips `href` from the fallback arm so it can't be passed accidentally. */
export type PolymorphicProps<
	Fallback extends keyof JSX.IntrinsicElements,
	Omitted extends PropertyKey = never,
> =
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<Fallback>, 'className' | Omitted>)
	| ({ href: string } & Omit<LinkProps, 'className' | Omitted>)

/** Renders the registered link component when `href` is present, the fallback intrinsic element otherwise. */
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
	href?: string
	ref?: Ref<Element>
	dataSlot: string
	className: string
	children: ReactNode
} & (
	| Omit<ComponentPropsWithoutRef<Fallback>, 'href' | 'ref' | 'className' | 'children'>
	| Omit<LinkProps, 'href' | 'ref' | 'className' | 'children'>
)) {
	const { component: LinkComponent } = useLink()

	if (href !== undefined) {
		return (
			<LinkComponent
				ref={ref as Ref<HTMLAnchorElement>}
				data-slot={dataSlot}
				href={href}
				className={className}
				{...(rest as Omit<LinkProps, 'href' | 'className'>)}
			>
				{children}
			</LinkComponent>
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
