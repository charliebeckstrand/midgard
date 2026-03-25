'use client'

import type React from 'react'
import { BaseOption } from '../../primitives'
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
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onSelect'>) {
	const { value: selectedValue, onChange } = useCombobox()
	const selected = selectedValue === value

	return (
		<BaseOption
			selected={selected}
			disabled={disabled}
			checkPosition="end"
			onSelect={() => onChange(value)}
			className={className}
			{...props}
		>
			{children}
		</BaseOption>
	)
}

export {
	OptionDescription as ComboboxDescription,
	OptionLabel as ComboboxLabel,
} from '../../primitives/option'
