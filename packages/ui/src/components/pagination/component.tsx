import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import { Button, type ButtonProps } from '../button'
import { Icon } from '../icon'
import {
	pageButtonVariants,
	paginationGapVariants,
	paginationListVariants,
	paginationVariants,
} from './variants'

export type PaginationProps = React.ComponentPropsWithoutRef<'nav'>

export type PaginationListProps = React.ComponentPropsWithoutRef<'ol'>

type PaginationPageBaseProps = {
	current?: boolean
	className?: string
}

export type PaginationPageProps = PaginationPageBaseProps & PolymorphicProps<'button'>

export type PaginationGapProps = React.ComponentPropsWithoutRef<'span'>

export type PaginationPreviousProps = ButtonProps

export type PaginationNextProps = ButtonProps

export function Pagination({ className, ...props }: PaginationProps) {
	return (
		<nav
			data-slot="pagination"
			aria-label="Pagination"
			className={cn(paginationVariants(), className)}
			{...props}
		/>
	)
}

export function PaginationList({ className, ...props }: PaginationListProps) {
	return (
		<ol
			data-slot="pagination-list"
			className={cn(paginationListVariants(), className)}
			{...props}
		/>
	)
}

export function PaginationPage({
	current = false,
	className,
	children,
	href,
	...props
}: PaginationPageProps) {
	return (
		<li>
			<Polymorphic
				as="button"
				dataSlot="pagination-page"
				href={href}
				aria-current={current ? 'page' : undefined}
				className={cn(pageButtonVariants({ current }), className)}
				{...props}
			>
				<span className="relative z-10">{children}</span>
			</Polymorphic>
		</li>
	)
}

export function PaginationGap({ className, ...props }: PaginationGapProps) {
	return (
		<li>
			<span
				data-slot="pagination-gap"
				className={cn(paginationGapVariants(), className)}
				{...props}
			>
				&hellip;
			</span>
		</li>
	)
}

function PaginationNavButton({
	slot,
	children,
	...props
}: { slot: string } & (PaginationPreviousProps | PaginationNextProps)) {
	return (
		<li>
			<Button data-slot={slot} variant="plain" {...props}>
				{children}
			</Button>
		</li>
	)
}

export function PaginationPrevious({
	children = <Icon name="chevron-left" />,
	...props
}: PaginationPreviousProps) {
	return (
		<PaginationNavButton slot="pagination-previous" {...props}>
			{children}
		</PaginationNavButton>
	)
}

export function PaginationNext({
	children = <Icon name="chevron-right" />,
	...props
}: PaginationNextProps) {
	return (
		<PaginationNavButton slot="pagination-next" {...props}>
			{children}
		</PaginationNavButton>
	)
}
