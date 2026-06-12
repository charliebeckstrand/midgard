import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'

export type DescriptionDetailsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dd'>, 'className'>

/**
 * Static leaf: renders in React Server Components. Carries text styling
 * only; the parent `<DescriptionList>` projects orientation layout.
 */
export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	return <dd data-slot="dl-details" className={cn(k.details, className)} {...props} />
}
