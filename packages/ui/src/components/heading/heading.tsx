'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import type { Step } from '../../recipes'
import { headingScale, k } from '../../recipes/kata/heading'
import { HeadingSkeleton } from './heading-skeleton'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type HeadingProps = {
	level?: HeadingLevel
	/**
	 * Overrides the ambient density `size` axis for this heading. Shifts the
	 * level's natural size along the type scale: `sm` one rung down, `lg` one
	 * up, `md` neutral. Omit to inherit from the surrounding `<Density>`.
	 */
	size?: Step
	className?: string
} & Omit<ComponentPropsWithoutRef<'h1'>, 'className'>

/**
 * Semantic heading rendering `h1`-`h6` per `level`. Weight tracks the level;
 * font size is the level's natural size shifted by the ambient density `size`
 * axis (override per-heading with `size`). Degrades to a skeleton placeholder
 * under `<Skeleton>`.
 */
export function Heading({ level = 1, size, className, ...props }: HeadingProps) {
	const { size: ambient } = useDensity()
	const skeleton = useSkeleton()

	if (skeleton) {
		return <HeadingSkeleton level={level} size={size} className={className} />
	}

	const scale = headingScale(level, size ?? ambient)

	const Tag = `h${level}` as const

	return <Tag data-slot="heading" className={cn(k({ level, scale }), className)} {...props} />
}
