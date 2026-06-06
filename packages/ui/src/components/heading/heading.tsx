'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { type HeadingVariants, k } from '../../recipes/kata/heading'
import { HeadingSkeleton } from './heading-skeleton'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = HeadingVariants & {
	level?: HeadingLevel
	className?: string
} & Omit<ComponentPropsWithoutRef<'h1'>, 'className'>

export function Heading({ level = 1, className, ...props }: HeadingProps) {
	if (useSkeleton()) {
		return <HeadingSkeleton level={level} className={className} />
	}

	const Tag = `h${level}` as const

	return <Tag data-slot="heading" className={cn(k({ level }), className)} {...props} />
}
