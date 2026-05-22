import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k, type TextVariants } from '../../recipes/kata/text'
import { Placeholder } from '../placeholder'

export type TextProps = TextVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'color'>

export function Text({ variant, color, className, ...props }: TextProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(k.skeleton.base, className)} />
	}

	return <p data-slot="text" className={cn(k({ variant, color }), className)} {...props} />
}
