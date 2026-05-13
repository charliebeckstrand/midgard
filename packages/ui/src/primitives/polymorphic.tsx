import type { ComponentPropsWithoutRef, ElementType, JSX, ReactNode, Ref } from 'react'
import { type LinkProps, useLink } from './link'

/** Discriminated union — renders as a link when `href` is provided, otherwise as the fallback element. */
export type PolymorphicProps<
	Fallback extends keyof JSX.IntrinsicElements,
	Omitted extends PropertyKey = never,
> =
	| ({ href?: never } & Omit<ComponentPropsWithoutRef<Fallback>, 'className' | Omitted>)
	| ({ href: string } & Omit<LinkProps, 'className' | Omitted>)

/** Renders as a link when `href` is present, otherwise as the fallback intrinsic element. */
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
