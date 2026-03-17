import clsx from 'clsx'
import type React from 'react'

/** Shared label for Listbox and Combobox options */
export function OptionLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={clsx(className, 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0')}
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
			className={clsx(
				className,
				'flex flex-1 overflow-hidden text-zinc-500 group-focus/option:text-white before:w-2 before:min-w-0 before:shrink dark:text-zinc-400',
			)}
		>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}
