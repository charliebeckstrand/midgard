import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type DescriptionDetailsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dd'>, 'className'>

export function DescriptionDetails({ className, ...props }: DescriptionDetailsProps) {
	return <dd data-slot="dl-details" className={cn(k.details, className)} {...props} />
}
