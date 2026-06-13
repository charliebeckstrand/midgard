import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'
import type { Orientation } from '../../types'

export type DlOrientation = Orientation

/** Variant axis for {@link DescriptionList}: term/details `orientation`. */
export type DescriptionListVariants = {
	orientation?: DlOrientation
}

/** Props for {@link DescriptionList}: `orientation` variant plus native `<dl>` attributes. */
export type DescriptionListProps = DescriptionListVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dl'>, 'className'>

/**
 * Semantic description list (`<dl>`) pairing `<DescriptionTerm>` with `<DescriptionDetails>`.
 * Lays out `horizontal` (terms beside details) or `vertical` (terms above details) and owns
 * every orientation-varying style, projecting it onto direct `dt` / `dd` children so term and
 * details stay context-free.
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
