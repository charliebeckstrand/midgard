'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/checkbox'
import { Placeholder } from '../placeholder'

export type CheckboxSkeletonProps = {
	className?: string
}

export function CheckboxSkeleton({ className }: CheckboxSkeletonProps) {
	return <Placeholder className={cn(k.skeleton.base, className)} />
}
