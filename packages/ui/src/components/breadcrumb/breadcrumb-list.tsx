import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { breadcrumbListVariants } from '../../recipes/kata/breadcrumb'

export type BreadcrumbListProps = ComponentPropsWithoutRef<'ol'>

export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(breadcrumbListVariants(), className)}
			{...props}
		/>
	)
}
