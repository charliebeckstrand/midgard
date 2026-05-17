'use client'

import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'

export type CheckboxSkeletonProps = {
	className?: string
}

export function CheckboxSkeleton({ className }: CheckboxSkeletonProps) {
	return <Placeholder className={cn(kokkaku.checkbox.base, className)} />
}
