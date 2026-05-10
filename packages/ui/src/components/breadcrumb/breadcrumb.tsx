import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { breadcrumbVariants } from '../../recipes/kata/breadcrumb'

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
	return (
		<nav
			data-slot="breadcrumb"
			aria-label="Breadcrumb"
			className={cn(breadcrumbVariants(), className)}
			{...props}
		/>
	)
}
