import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import {
	pageButtonVariants,
	paginationGapVariants,
	paginationNavVariants,
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

type PaginationNavBaseProps = {
	className?: string
}

export type PaginationPreviousProps = PaginationNavBaseProps & PolymorphicProps<'button'>

export type PaginationNextProps = PaginationNavBaseProps & PolymorphicProps<'button'>

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
			className={cn('flex list-none items-center gap-1 m-0 p-0', className)}
			{...props}
		/>
	)
}

export function PaginationPage({
	current = false,
	className,
	children,
	...props
}: PaginationPageProps) {
	return (
		<li>
			<Polymorphic
				as="button"
				dataSlot="pagination-page"
				href={props.href}
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
	className,
	children,
	...props
}: { slot: string } & (PaginationPreviousProps | PaginationNextProps)) {
	return (
		<li>
			<Polymorphic
				as="button"
				dataSlot={slot}
				href={props.href}
				className={cn(paginationNavVariants(), className)}
				{...props}
			>
				{children}
			</Polymorphic>
		</li>
	)
}

export function PaginationPrevious({ children = 'Previous', ...props }: PaginationPreviousProps) {
	return (
		<PaginationNavButton slot="pagination-previous" {...props}>
			{children}
		</PaginationNavButton>
	)
}

export function PaginationNext({ children = 'Next', ...props }: PaginationNextProps) {
	return (
		<PaginationNavButton slot="pagination-next" {...props}>
			{children}
		</PaginationNavButton>
	)
}
