import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/description-list'
import { adaptive, type Orientation, type Responsive, resolveVariant } from '../../types'

/** The default `orientation` of {@link DescriptionList}: vertical on a compact viewport, horizontal from medium. */
export const DESCRIPTION_LIST_ORIENTATION = adaptive({
	compact: 'vertical',
	medium: 'horizontal',
}) satisfies Responsive<Orientation>

/** Variant axis for {@link DescriptionList}: term/details `orientation`. */
export type DescriptionListVariants = {
	/**
	 * The layout of each term and its details: `horizontal` puts the term beside
	 * its details, and `vertical` puts the term above them. A per-breakpoint map
	 * sets the layout from each breakpoint, mobile-first. A single value sets it
	 * at each width.
	 * @defaultValue {@link DESCRIPTION_LIST_ORIENTATION}
	 */
	orientation?: Responsive<Orientation>
}

/** Props for {@link DescriptionList}: `orientation` variant plus native `<dl>` attributes. */
export type DescriptionListProps = DescriptionListVariants & {} & ComponentProps<'dl'>

/**
 * Semantic description list (`<dl>`) pairing `<DescriptionTerm>` with `<DescriptionDetails>`.
 * Lays out `horizontal` (terms beside details) or `vertical` (terms above
 * details). By default it is vertical below the `sm` breakpoint and horizontal
 * from it. It owns every orientation-varying style, and projects it onto direct
 * `dt` / `dd` children, so term and details stay context-free.
 *
 * The text and the block padding of each cell take the step of the nearest
 * density scope. At `md` the text is `text-sm`, each pair after the first has
 * `pt-4` above it, and the details have `pt-1` under their term. The padding is
 * the same in each orientation.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components. CSS
 * picks the layout at each breakpoint, so the first paint has the final layout.
 * Projection targets only direct children: wrapping `dt`/`dd` in intermediate
 * elements bypasses the layout.
 */
export function DescriptionList({
	orientation = DESCRIPTION_LIST_ORIENTATION,
	className,
	...props
}: DescriptionListProps) {
	return (
		<dl
			data-slot="dl"
			data-orientation={typeof orientation === 'string' ? orientation : undefined}
			className={cn(k.base, resolveVariant(orientation, k.orientation), className)}
			{...props}
		/>
	)
}
