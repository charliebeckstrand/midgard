import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/description-list'
import type { Orientation } from '../../types'

type DlOrientation = Orientation

/** Variant axis for {@link DescriptionList}: term/details `orientation`. */
export type DescriptionListVariants = {
	orientation?: DlOrientation
}

/** Props for {@link DescriptionList}: `orientation` variant plus native `<dl>` attributes. */
export type DescriptionListProps = DescriptionListVariants & {
	className?: string
} & Omit<ComponentProps<'dl'>, 'className'>

/**
 * Semantic description list (`<dl>`) pairing `<DescriptionTerm>` with `<DescriptionDetails>`.
 * Lays out `horizontal` (terms beside details) or `vertical` (terms above
 * details). It owns every orientation-varying style, and projects it onto
 * direct `dt` / `dd` children, so term and details stay context-free.
 *
 * The text and the block padding of each cell take the step of the nearest
 * density scope. At `md` the text is `text-sm`, and a horizontal cell has
 * `py-2` from the `sm` breakpoint.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components. Projection targets
 * only direct children — wrapping `dt`/`dd` in intermediate elements bypasses the layout.
 *
 * @defaultValue orientation 'horizontal'
 */
export function DescriptionList({
	orientation = 'horizontal',
	className,
	...props
}: DescriptionListProps) {
	return (
		<dl
			data-slot="dl"
			data-orientation={orientation}
			className={cn(k.root({ orientation }), k.projection[orientation], className)}
			{...props}
		/>
	)
}
