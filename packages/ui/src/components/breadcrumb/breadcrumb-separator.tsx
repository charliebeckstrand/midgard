import { ChevronRight } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'
import { Icon } from '../icon'

export type BreadcrumbSeparatorProps = ComponentPropsWithoutRef<'li'>

const DEFAULT_SEPARATOR = <Icon icon={<ChevronRight />} aria-hidden="true" />

export function BreadcrumbSeparator({ children, className, ...props }: BreadcrumbSeparatorProps) {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(k.separator(), className)}
			{...props}
		>
			{children ?? DEFAULT_SEPARATOR}
		</li>
	)
}
