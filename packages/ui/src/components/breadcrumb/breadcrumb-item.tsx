import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'

export type BreadcrumbItemProps = { current?: boolean } & ComponentPropsWithoutRef<'li'>

export function BreadcrumbItem({ current = false, className, ...props }: BreadcrumbItemProps) {
	return (
		<li
			data-slot="breadcrumb-item"
			aria-current={current ? 'page' : undefined}
			className={cn(k.item({ current }), className)}
			{...props}
		/>
	)
}
