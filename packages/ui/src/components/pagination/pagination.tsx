import type React from 'react'
import { cn } from '../../core'
import { Button } from '../button/button'

function PreviousIcon() {
	return (
		<svg
			className="stroke-current"
			data-slot="icon"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M10.25 3.75L5.75 8L10.25 12.25"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function NextIcon() {
	return (
		<svg
			className="stroke-current"
			data-slot="icon"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M5.75 3.75L10.25 8L5.75 12.25"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function Pagination({
	'aria-label': ariaLabel = 'Page navigation',
	className,
	...props
}: React.ComponentPropsWithoutRef<'nav'>) {
	return <nav aria-label={ariaLabel} {...props} className={cn('flex gap-x-2', className)} />
}

export function PaginationPrevious({
	href = null,
	className,
	icon,
	children = 'Previous',
}: React.PropsWithChildren<{
	href?: string | null
	className?: string
	icon?: React.ReactNode
}>) {
	return (
		<span className={cn('grow basis-0', className)}>
			<Button
				{...(href === null ? { disabled: true } : { href })}
				variant="plain"
				aria-label="Previous page"
			>
				{icon ?? <PreviousIcon />}
				{children}
			</Button>
		</span>
	)
}

export function PaginationNext({
	href = null,
	className,
	icon,
	children = 'Next',
}: React.PropsWithChildren<{
	href?: string | null
	className?: string
	icon?: React.ReactNode
}>) {
	return (
		<span className={cn('flex grow basis-0 justify-end', className)}>
			<Button
				{...(href === null ? { disabled: true } : { href })}
				variant="plain"
				aria-label="Next page"
			>
				{children}
				{icon ?? <NextIcon />}
			</Button>
		</span>
	)
}
