import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type HeadingVariants, headingVariants } from './variants'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = HeadingVariants & {
	level?: HeadingLevel
	className?: string
} & Omit<ComponentPropsWithoutRef<'h1'>, 'className'>

export function Heading({ level = 1, className, ...props }: HeadingProps) {
	if (useSkeleton()) {
		return (
			<Placeholder className={cn(kokkaku.heading.base, kokkaku.heading.level[level], className)} />
		)
	}

	const Tag = `h${level}` as const

	return (
		<Tag data-slot="heading" className={cn(headingVariants({ level }), className)} {...props} />
	)
}
