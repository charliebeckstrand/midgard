import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'

/** Props for {@link GridDivider}: the `soft` lightening variant plus native `<hr>` attributes. */
export type GridDividerProps = {
	soft?: boolean
	className?: string
} & Omit<ComponentPropsWithoutRef<'hr'>, 'className'>

/**
 * Full-bleed rule (`<hr>`) for separating {@link Grid} rows, spanning every
 * column. `soft` lightens the line.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export function GridDivider({ soft, className, ...props }: GridDividerProps) {
	return <hr data-slot="grid-divider" className={cn(k.divider({ soft }), className)} {...props} />
}
