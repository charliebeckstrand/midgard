import { ChevronRight } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'
import { Icon } from '../icon'

/** Props for {@link BreadcrumbSeparator}; the underlying `<li>` attributes. */
export type BreadcrumbSeparatorProps = ComponentProps<'li'>

const DEFAULT_SEPARATOR = (
	<Icon icon={<ChevronRight />} aria-hidden="true" className="rtl:-scale-x-100" />
)

/**
 * Visual divider between crumbs, hidden from assistive tech (`aria-hidden`), so
 * the list count holds only the crumbs. It has no `role`: ARIA in HTML allows
 * only `listitem` on an `<li>` in a list. Defaults to a chevron `<Icon>`;
 * pass `children` to override. The default chevron mirrors in a right-to-left
 * document. Static leaf: renders in React Server Components.
 */
export function BreadcrumbSeparator({ children, className, ...props }: BreadcrumbSeparatorProps) {
	return (
		<li
			data-slot="breadcrumb-separator"
			aria-hidden="true"
			className={cn(k.separator(), className)}
			{...props}
		>
			{children ?? DEFAULT_SEPARATOR}
		</li>
	)
}
