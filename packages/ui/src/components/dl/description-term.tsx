import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dl'

export type DescriptionTermProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dt'>, 'className'>

/**
 * Static leaf: renders in React Server Components. Carries text styling
 * only; the parent `<DescriptionList>` projects orientation layout.
 */
export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	return <dt data-slot="dl-term" className={cn(k.term, className)} {...props} />
}
