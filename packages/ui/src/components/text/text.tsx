import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { kokkaku } from '../../recipes'
import { type TextVariants, textVariants } from '../../recipes/kata/text'
import { Placeholder } from '../placeholder'

export type TextProps = TextVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'color'>

export function Text({ variant, color, className, ...props }: TextProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.text.base, className)} />
	}

	return (
		<p data-slot="text" className={cn(textVariants({ variant, color }), className)} {...props} />
	)
}
