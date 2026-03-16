'use client'

import clsx from 'clsx'
import type React from 'react'
import { CheckIcon } from '../../primitives'
import { menuItemBase, menuItemSlots } from '../../recipes/item'
import { useListbox, useSelectedOption } from './context'

export function ListboxOption<T>({
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
	const { value: selectedValue, onChange } = useListbox()
	const { isSelectedOption } = useSelectedOption()
	const selected = selectedValue === value

	const sharedClasses = clsx('flex min-w-0 items-center', menuItemSlots)

	if (isSelectedOption) {
		if (!selected) return null
		return <span className={clsx(className, sharedClasses)}>{children}</span>
	}

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
				'group/option grid cursor-default grid-cols-[--spacing(5)_1fr] items-baseline gap-x-2 rounded-lg pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:pr-3 sm:pl-1.5',
				menuItemBase,
			)}
			{...props}
		>
			<CheckIcon className="relative hidden self-center group-data-selected/option:inline" />
			<span className={clsx(className, sharedClasses, 'col-start-2')}>{children}</span>
		</div>
	)
}

export function ListboxLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span
			{...props}
			className={clsx(className, 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0')}
		/>
	)
}

export function ListboxDescription({
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
