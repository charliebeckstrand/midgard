import type React from 'react'
import { cn } from '../core'
import { narabi, sawari } from '../recipes'
import { CheckIcon } from './icons'

export type BaseOptionProps = {
	className?: string
	children?: React.ReactNode
	selected: boolean
	disabled?: boolean
	checkPosition: 'start' | 'end'
	onSelect: () => void
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onSelect'>

/** Shared option primitive for Listbox and Combobox */
export function BaseOption({
	children,
	className,
	selected,
	disabled,
	checkPosition,
	onSelect,
	...props
}: BaseOptionProps) {
	const isStart = checkPosition === 'start'
	const sharedClasses = cn('flex min-w-0 items-center', narabi.item)

	return (
		<div
			role="option"
			aria-selected={selected}
			data-selected={selected ? '' : undefined}
			data-disabled={disabled ? '' : undefined}
			tabIndex={-1}
			onClick={() => !disabled && onSelect()}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()

					if (!disabled) onSelect()
				}
			}}
			className={cn(
				'group/option grid w-full cursor-default items-baseline gap-x-2 rounded-lg',
				isStart
					? 'grid-cols-[--spacing(5)_1fr] pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:pr-3 sm:pl-1.5'
					: 'grid-cols-[1fr_--spacing(5)] pr-2 pl-3.5 sm:grid-cols-[1fr_--spacing(4)] sm:pr-2 sm:pl-3',
				sawari.item,
			)}
			{...props}
		>
			{isStart && (
				<CheckIcon className="relative hidden self-center text-green-600 group-data-selected/option:inline" />
			)}
			<span className={cn(className, sharedClasses, isStart && 'col-start-2')}>{children}</span>
			{!isStart && (
				<CheckIcon className="relative col-start-2 hidden self-center text-green-600 group-data-selected/option:inline" />
			)}
		</div>
	)
}

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
