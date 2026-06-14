'use client'

import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/pagination'

type PaginationPageBaseProps = {
	/**
	 * Marks this as the active page; sets `aria-current="page"` and mounts the
	 * shared active indicator.
	 * @defaultValue false
	 */
	current?: boolean
	className?: string
}

/** Props for {@link PaginationPage}: a `current` flag plus polymorphic `<button>`/anchor attributes. */
export type PaginationPageProps = PaginationPageBaseProps & PolymorphicProps<'button'>

/**
 * Single page control. Renders a `<button>` or, when `href` is set, an anchor,
 * marking itself `aria-current="page"` and mounting the scope's active
 * indicator while `current`.
 */
export function PaginationPage({
	current = false,
	className,
	children,
	href,
	...props
}: PaginationPageProps) {
	const indicator = useActiveIndicator()

	return (
		<li>
			<span className={k.wrapper} {...indicator.tapHandlers}>
				<Polymorphic
					as="button"
					data-slot="pagination-page"
					href={href}
					aria-current={current ? 'page' : undefined}
					className={cn(k.pageButton({ current }), className)}
					{...props}
				>
					{children}
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		</li>
	)
}
