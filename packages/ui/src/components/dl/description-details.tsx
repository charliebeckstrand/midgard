import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'

/** Props for {@link DescriptionDetails}: native `<dd>` attributes. */
export type DescriptionDetailsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dd'>, 'className'>

/**
 * Details cell (`<dd>`) for a `<DescriptionList>` term/details pair. Carries text styling only;
 * the parent `<DescriptionList>` projects the orientation layout onto it.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	return <dd data-slot="dl-details" className={cn(k.details, className)} {...props} />
}
