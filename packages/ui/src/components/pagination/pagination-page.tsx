'use client'

import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/pagination'

type PaginationPageBaseProps = {
	current?: boolean
	className?: string
}

export type PaginationPageProps = PaginationPageBaseProps & PolymorphicProps<'button'>

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
			<span className="group relative inline-flex" {...indicator.tapHandlers}>
				<Polymorphic
					as="button"
					dataSlot="pagination-page"
					href={href}
					aria-current={current ? 'page' : undefined}
					className={cn(k.pageButton({ current }), 'relative z-1', className)}
					{...props}
				>
					{children}
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		</li>
	)
}
