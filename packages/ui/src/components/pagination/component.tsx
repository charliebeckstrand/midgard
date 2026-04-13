'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../core'
import {
	ActiveIndicator,
	ActiveIndicatorScope,
	Polymorphic,
	type PolymorphicProps,
	useActiveIndicator,
} from '../../primitives'
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

export function PaginationList({ className, children, ...props }: PaginationListProps) {
	return (
		<ActiveIndicatorScope>
			<ol
				data-slot="pagination-list"
				className={cn(paginationListVariants(), className)}
				{...props}
			>
				{children}
			</ol>
		</ActiveIndicatorScope>
	)
}

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
			<Polymorphic
				as="button"
				dataSlot="pagination-page"
				href={href}
				aria-current={current ? 'page' : undefined}
				className={cn(pageButtonVariants({ current }), className)}
				{...indicator.tapHandlers}
				{...props}
			>
				<span className="relative z-10">{children}</span>
				{current && <ActiveIndicator ref={indicator.ref} />}
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
	children = <Icon icon={<ChevronLeft />} />,
	...props
}: PaginationPreviousProps) {
	return (
		<PaginationNavButton slot="pagination-previous" {...props}>
			{children}
		</PaginationNavButton>
	)
}

export function PaginationNext({
	children = <Icon icon={<ChevronRight />} />,
	...props
}: PaginationNextProps) {
	return (
		<PaginationNavButton slot="pagination-next" {...props}>
			{children}
		</PaginationNavButton>
	)
}
