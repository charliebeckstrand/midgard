import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { breadcrumbItemVariants } from './variants'

export type BreadcrumbItemProps = { current?: boolean } & ComponentPropsWithoutRef<'li'>

export function BreadcrumbItem({ current = false, className, ...props }: BreadcrumbItemProps) {
	return (
		<li
			data-slot="breadcrumb-item"
			aria-current={current ? 'page' : undefined}
			className={cn(breadcrumbItemVariants({ current }), className)}
			{...props}
		/>
	)
}
