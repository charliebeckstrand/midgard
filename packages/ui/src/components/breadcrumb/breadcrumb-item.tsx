import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'

export type BreadcrumbItemProps = { current?: boolean } & ComponentPropsWithoutRef<'li'>

export function BreadcrumbItem({ current = false, className, ...props }: BreadcrumbItemProps) {
	// `current` drives styling only; `aria-current` belongs on the crumb itself
	// (BreadcrumbLink) — stamping the <li> too would announce it twice.
	return (
		<li data-slot="breadcrumb-item" className={cn(k.item({ current }), className)} {...props} />
	)
}
