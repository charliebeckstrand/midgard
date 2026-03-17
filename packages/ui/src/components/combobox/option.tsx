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

export {
	OptionDescription as ComboboxDescription,
	OptionLabel as ComboboxLabel,
} from '../../primitives/option-parts'
