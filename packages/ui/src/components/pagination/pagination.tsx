import clsx from 'clsx'
import type React from 'react'
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
				d="M2.75 8H13.25M2.75 8L5.25 5.5M2.75 8L5.25 10.5"
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
				d="M13.25 8L2.75 8M13.25 8L10.75 10.5M13.25 8L10.75 5.5"
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
	return <nav aria-label={ariaLabel} {...props} className={clsx(className, 'flex gap-x-2')} />
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
		<span className={clsx(className, 'grow basis-0')}>
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
		<span className={clsx(className, 'flex grow basis-0 justify-end')}>
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
