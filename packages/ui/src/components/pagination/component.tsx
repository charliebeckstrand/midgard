import { cn, Link } from '../../core'
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

export type PaginationPageProps = PaginationPageBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export type PaginationGapProps = React.ComponentPropsWithoutRef<'span'>

type PaginationNavBaseProps = {
	className?: string
}

export type PaginationPreviousProps = PaginationNavBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export type PaginationNextProps = PaginationNavBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

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
			className={cn('flex list-none items-center gap-1', className)}
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
	const classes = cn(pageButtonVariants({ current }), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<li>
				<Link
					data-slot="pagination-page"
					href={href}
					aria-current={current ? 'page' : undefined}
					className={classes}
					{...linkProps}
				>
					<span className="relative z-10">{children}</span>
				</Link>
			</li>
		)
	}

	return (
		<li>
			<button
				data-slot="pagination-page"
				type="button"
				aria-current={current ? 'page' : undefined}
				className={classes}
				{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)}
			>
				<span className="relative z-10">{children}</span>
			</button>
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
	const classes = cn(paginationNavVariants(), className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<li>
				<Link data-slot={slot} href={href} className={classes} {...linkProps}>
					{children}
				</Link>
			</li>
		)
	}

	return (
		<li>
			<button
				data-slot={slot}
				type="button"
				className={classes}
				{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)}
			>
				{children}
			</button>
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
