import type { ComponentProps, ElementType, ReactNode, Ref } from 'react'
import type { DensityStep } from '../../core/density'
import type { LinkProps } from '../link'

/**
 * The render props that `PolymorphicStatic` takes and `Polymorphic` forwards to
 * it: the `as` fallback and the optional `href`. It also carries the forwarded `ref` /
 * `data-slot` / `className` / `children`, and the remaining props of whichever
 * arm applies.
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
	/**
	 * Makes the element a density scope at this step: it writes `data-density`
	 * and opens the density context around the children. Omit it for no scope.
	 */
	density?: DensityStep
} & (
	| Omit<ComponentProps<Fallback>, 'href' | 'ref' | 'className' | 'children'>
	| Omit<LinkProps, 'href' | 'ref' | 'className' | 'children'>
)
