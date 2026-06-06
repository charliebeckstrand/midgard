'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k, type TextVariants } from '../../recipes/kata/text'
import { TextSkeleton } from './text-skeleton'

export type TextProps = TextVariants & {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'color'>

/** Paragraph text styled by `variant` and `color` from the text recipe. */
export function Text({ variant, color, className, ...props }: TextProps) {
	if (useSkeleton()) {
		return <TextSkeleton className={className} />
	}

	return <p data-slot="text" className={cn(k({ variant, color }), className)} {...props} />
}
