import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'

export function DropdownSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="section"
			{...props}
			className={cn(
				'col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
				className,
			)}
		/>
	)
}

export function DropdownHeading({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="heading"
			{...props}
			className={cn(
				`col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 text-sm/5 font-medium ${sumi.usui} sm:px-3 sm:text-xs/5`,
				className,
			)}
		/>
	)
}

export function DropdownDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
	return (
		<hr
			data-slot="divider"
			{...props}
			className={cn(
				'col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3',
				'dark:bg-white/10',
				'forced-colors:bg-[CanvasText]',
				className,
			)}
		/>
	)
}

export function DropdownHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="header"
			{...props}
			className={cn('col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3', className)}
		/>
	)
}
