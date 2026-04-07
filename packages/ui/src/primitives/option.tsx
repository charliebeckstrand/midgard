import type React from 'react'
import { cn } from '../core'
import { CheckIcon } from '../icons'
import { katachi } from '../recipes'

const k = katachi.option

export type BaseOptionProps = {
	className?: string
	children?: React.ReactNode
	icon?: React.ReactNode
	selected: boolean
	disabled?: boolean
	checkPosition: 'start' | 'end'
	onSelect: () => void
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onSelect'>

/** Shared option primitive for Listbox and Combobox */
export function BaseOption({
	children,
	className,
	icon,
	selected,
	disabled,
	checkPosition,
	onSelect,
	...props
}: BaseOptionProps) {
	const isStart = checkPosition === 'start'
	const sharedClasses = cn(k.content)

	const checkIcon = icon ?? (
		<CheckIcon className="relative hidden self-center text-green-600 group-data-selected/option:inline" />
	)

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
			className={cn(k.base, isStart ? k.start : k.end)}
			{...props}
		>
			{isStart && checkIcon}
			<span className={cn(className, sharedClasses, isStart && 'col-start-2')}>{children}</span>
			{!isStart && checkIcon}
		</div>
	)
}

/** Shared label for Listbox and Combobox options */
export function OptionLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.label, 'group-data-selected/option:font-bold', className)} />
	)
}

/** Shared description for Listbox and Combobox options */
export function OptionDescription({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.description, className)}>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}
