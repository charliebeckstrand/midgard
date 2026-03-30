'use client'

import type React from 'react'
import { cn } from '../../core'
import { BaseOption, OptionDescription, OptionLabel } from '../../primitives'
import { useComboboxContext } from './combobox'

export type ComboboxOptionProps = {
	value: unknown
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

export function ComboboxOption({ value, disabled, className, children }: ComboboxOptionProps) {
	const { value: selectedValue, select } = useComboboxContext()

	return (
		<BaseOption
			selected={selectedValue === value}
			disabled={disabled}
			checkPosition="end"
			onSelect={() => select(value)}
			data-slot="combobox-option"
			className={className}
		>
			{children}
		</BaseOption>
	)
}

export type ComboboxLabelProps = React.ComponentPropsWithoutRef<'span'>

export function ComboboxLabel({ className, ...props }: ComboboxLabelProps) {
	return <OptionLabel data-slot="combobox-label" className={cn(className)} {...props} />
}

export type ComboboxDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function ComboboxDescription({ className, ...props }: ComboboxDescriptionProps) {
	return <OptionDescription data-slot="combobox-description" className={cn(className)} {...props} />
}
