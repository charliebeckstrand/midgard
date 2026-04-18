'use client'

import { cn } from '../../core'
import {
	ActiveIndicator,
	Polymorphic,
	type PolymorphicProps,
	useActiveIndicator,
} from '../../primitives'
import { pageButtonVariants } from './variants'

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
					className={cn(pageButtonVariants({ current }), 'relative z-1', className)}
					{...props}
				>
					{children}
				</Polymorphic>
				{current && <ActiveIndicator ref={indicator.ref} />}
			</span>
		</li>
	)
}
