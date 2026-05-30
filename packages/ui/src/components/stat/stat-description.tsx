'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { k } from '../../recipes/kata/stat'
import { Placeholder } from '../placeholder'

export type StatDescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDescription({ className, children, ...props }: StatDescriptionProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(k.skeleton.description, className)} />
	}

	return (
		<div data-slot="stat-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
