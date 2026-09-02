import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from 'react'
import type { LinkProps } from '../link'

/**
 * Render props shared by `Polymorphic` and `PolymorphicStatic`: the `as`
 * fallback, the optional `href`, the forwarded `ref` / `data-slot` /
 * `className` / `children`, and the remaining props of whichever arm applies.
 *
 * @internal
 */
export type PolymorphicRenderProps<Fallback extends ElementType> = {
	as: Fallback
	href?: string
	ref?: Ref<Element>
	'data-slot': string
	className: string
	children: ReactNode
} & (
	| Omit<ComponentPropsWithoutRef<Fallback>, 'href' | 'ref' | 'className' | 'children'>
	| Omit<LinkProps, 'href' | 'ref' | 'className' | 'children'>
)

/** Input to {@link renderFallback}: the `as` element and the props it forwards. @internal */
type FallbackRender<Fallback extends ElementType> = {
	as: Fallback
	ref: Ref<Element> | undefined
	slot: string
	className: string
	children: ReactNode
	rest: ComponentPropsWithoutRef<Fallback>
}

/**
 * The non-`href` arm shared by `Polymorphic` and `PolymorphicStatic`: renders
 * the `as` element with the forwarded props. This module carries no
 * `'use client'` directive, so `PolymorphicStatic` stays server-safe.
 *
 * @internal
 */
export function renderFallback<Fallback extends ElementType>({
	as,
	ref,
	slot,
	className,
	children,
	rest,
}: FallbackRender<Fallback>) {
	// `as as ElementType` widens a union of string tags to `ElementType`;
	// the narrow union collapses `{...rest}` to the `never` intersection of
	// every branch. Unrelated to the generic.
	const Element = as as ElementType

	return (
		<Element
			ref={ref}
			data-slot={slot}
			type={as === 'button' ? 'button' : undefined}
			className={className}
			{...rest}
		>
			{children}
		</Element>
	)
}
