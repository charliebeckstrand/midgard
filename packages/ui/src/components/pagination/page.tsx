import clsx from 'clsx'
import type React from 'react'
import { Button } from '../button/button'

export function PaginationList({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={clsx(className, 'hidden items-baseline gap-x-2 sm:flex')} />
}

export function PaginationPage({
	href,
	className,
	current = false,
	children,
}: React.PropsWithChildren<{ href: string; className?: string; current?: boolean }>) {
	return (
		<Button
			href={href}
			variant="plain"
			aria-label={`Page ${children}`}
			aria-current={current ? 'page' : undefined}
			className={clsx(
				className,
				'min-w-9 before:absolute before:-inset-px before:rounded-lg',
				current && 'before:bg-zinc-950/5 dark:before:bg-white/10',
			)}
		>
			<span className="-mx-0.5">{children}</span>
		</Button>
	)
}

export function PaginationGap({
	className,
	children = <>&hellip;</>,
	...props
}: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			aria-hidden="true"
			{...props}
			className={clsx(
				className,
				'w-9 text-center text-sm/6 font-semibold text-zinc-950 select-none dark:text-white',
			)}
		>
			{children}
		</span>
	)
}
