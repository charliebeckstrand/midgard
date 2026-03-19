import type React from 'react'
import { cn } from '../core'

/** Shared label for Listbox and Combobox options */
export function OptionLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={cn('ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0', className)}
		/>
	)
}

/** Shared description for Listbox and Combobox options */
export function OptionDescription({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={cn(
				'flex flex-1 overflow-hidden text-zinc-500 before:w-2 before:min-w-0 before:shrink',
				'group-focus/option:text-white',
				'dark:text-zinc-400',
				className,
			)}
		>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}
