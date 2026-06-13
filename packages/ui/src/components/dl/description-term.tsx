import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'

/** Props for {@link DescriptionTerm}: native `<dt>` attributes. */
export type DescriptionTermProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dt'>, 'className'>

/**
 * Term cell (`<dt>`) for a `<DescriptionList>` term/details pair. Carries text styling only;
 * the parent `<DescriptionList>` projects the orientation layout onto it.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	return <dt data-slot="dl-term" className={cn(k.term, className)} {...props} />
}
