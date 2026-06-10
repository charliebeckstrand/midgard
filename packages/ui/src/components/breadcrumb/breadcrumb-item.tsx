import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'

export type BreadcrumbItemProps = { current?: boolean } & ComponentPropsWithoutRef<'li'>

export function BreadcrumbItem({ current = false, className, ...props }: BreadcrumbItemProps) {
	// `current` drives styling only; `aria-current` lives on the crumb itself
	// (BreadcrumbLink), not the <li>.
	return (
		<li data-slot="breadcrumb-item" className={cn(k.item({ current }), className)} {...props} />
	)
}
