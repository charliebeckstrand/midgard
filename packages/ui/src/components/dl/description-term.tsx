import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type DescriptionTermProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dt'>, 'className'>

export function DescriptionTerm({ className, ...props }: DescriptionTermProps) {
	return <dt data-slot="dl-term" className={cn(k.term, className)} {...props} />
}
