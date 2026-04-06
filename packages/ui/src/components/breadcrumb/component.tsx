import { cn, Link } from '../../core'
import {
	breadcrumbItemVariants,
	breadcrumbLinkVariants,
	breadcrumbListVariants,
	breadcrumbSeparatorVariants,
	breadcrumbVariants,
} from './variants'

export type BreadcrumbProps = React.ComponentPropsWithoutRef<'nav'>

export type BreadcrumbListProps = React.ComponentPropsWithoutRef<'ol'>

export type BreadcrumbItemProps = { current?: boolean } & React.ComponentPropsWithoutRef<'li'>

export type BreadcrumbLinkProps = { current?: boolean } & (
	| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>)
) & { className?: string }

export type BreadcrumbSeparatorProps = React.ComponentPropsWithoutRef<'li'>

export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
	return (
		<nav
			data-slot="breadcrumb"
			aria-label="Breadcrumb"
			className={cn(breadcrumbVariants(), className)}
			{...props}
		/>
	)
}

export function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(breadcrumbListVariants(), className)}
			{...props}
		/>
	)
}

export function BreadcrumbItem({ current = false, className, ...props }: BreadcrumbItemProps) {
	return (
		<li
			data-slot="breadcrumb-item"
			aria-current={current ? 'page' : undefined}
			className={cn(breadcrumbItemVariants({ current }), className)}
			{...props}
		/>
	)
}

export function BreadcrumbLink({
	current = false,
	className,
	href,
	...props
}: BreadcrumbLinkProps) {
	const classes = cn(breadcrumbLinkVariants({ current }), className)

	if (href) {
		return (
			<Link
				data-slot="breadcrumb-link"
				href={href}
				className={classes}
				{...(props as Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
			/>
		)
	}

	return (
		<span
			data-slot="breadcrumb-link"
			aria-current={current ? 'page' : undefined}
			className={classes}
			{...(props as Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>)}
		/>
	)
}

export function BreadcrumbSeparator({ children, className, ...props }: BreadcrumbSeparatorProps) {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(breadcrumbSeparatorVariants(), className)}
			{...props}
		>
			{children ?? (
				<svg
					role="img"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
			)}
		</li>
	)
}
