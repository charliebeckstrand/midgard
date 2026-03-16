'use client'

import clsx from 'clsx'
import type React from 'react'
import { CheckIcon } from '../../primitives'
import { menuItemBase, menuItemSlots } from '../../recipes/item'
import { useCombobox } from './context'

export function ComboboxOption<T>({
	children,
	className,
	value,
	disabled,
	...props
}: {
	className?: string
	children?: React.ReactNode
	value: T
	disabled?: boolean
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>) {
	const { value: selectedValue, onChange } = useCombobox()
	const selected = selectedValue === value

	const sharedClasses = clsx('flex min-w-0 items-center', menuItemSlots)

	return (
		<div
			role="option"
			aria-selected={selected}
			data-selected={selected ? '' : undefined}
			data-disabled={disabled ? '' : undefined}
			tabIndex={-1}
			onClick={() => !disabled && onChange(value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					if (!disabled) onChange(value)
				}
			}}
			className={clsx(
				'group/option grid w-full cursor-default grid-cols-[1fr_--spacing(5)] items-baseline gap-x-2 rounded-lg pr-2 pl-3.5 sm:grid-cols-[1fr_--spacing(4)] sm:pr-2 sm:pl-3',
				menuItemBase,
			)}
			{...props}
		>
			<span className={clsx(className, sharedClasses)}>{children}</span>
			<CheckIcon className="relative col-start-2 hidden self-center group-data-selected/option:inline" />
		</div>
	)
}

export function ComboboxLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={clsx(className, 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0')}
		/>
	)
}

export function ComboboxDescription({
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
