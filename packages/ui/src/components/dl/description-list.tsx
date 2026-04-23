import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type DescriptionListVariants = Record<string, never>

export type DescriptionListProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'dl'>, 'className'>

export function DescriptionList({ className, ...props }: DescriptionListProps) {
	return <dl data-slot="dl" className={cn(k.base, className)} {...props} />
}
