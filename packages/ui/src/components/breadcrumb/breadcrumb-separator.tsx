import { ChevronRight } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'
import { Icon } from '../icon'

/** Props for {@link BreadcrumbSeparator}; the underlying `<li>` attributes. */
export type BreadcrumbSeparatorProps = ComponentPropsWithoutRef<'li'>

const DEFAULT_SEPARATOR = <Icon icon={<ChevronRight />} aria-hidden="true" />

/**
 * Visual divider between crumbs, presentational and hidden from assistive tech
 * (`role="presentation"`, `aria-hidden`). Defaults to a chevron `<Icon>`;
 * pass `children` to override. Static leaf: renders in React Server Components.
 */
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
