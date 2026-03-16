import clsx from 'clsx'
import type React from 'react'

export function DropdownSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
			)}
		/>
	)
}

export function DropdownHeading({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 text-sm/5 font-medium text-zinc-500 sm:px-3 sm:text-xs/5 dark:text-zinc-400',
			)}
		/>
	)
}

export function DropdownDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
	return (
		<hr
			{...props}
			className={clsx(
				className,
				'col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3 dark:bg-white/10 forced-colors:bg-[CanvasText]',
			)}
		/>
	)
}

export function DropdownHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} className={clsx(className, 'col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3')} />
}
