'use client'

import type React from 'react'
import { cn } from '../../core'
import { BaseOption, OptionDescription, OptionLabel } from '../../primitives'
import { useListboxContext } from './listbox'

export type ListboxOptionProps = {
	value: unknown
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

export function ListboxOption({ value, disabled, className, children }: ListboxOptionProps) {
	const { value: selectedValue, select } = useListboxContext()

	return (
		<BaseOption
			selected={selectedValue === value}
			disabled={disabled}
			checkPosition="end"
			onSelect={() => select(value)}
			data-slot="listbox-option"
			className={className}
		>
			{children}
		</BaseOption>
	)
}

export type ListboxLabelProps = React.ComponentPropsWithoutRef<'span'>

export function ListboxLabel({ className, ...props }: ListboxLabelProps) {
	return <OptionLabel data-slot="listbox-label" className={cn(className)} {...props} />
}

export type ListboxDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function ListboxDescription({ className, ...props }: ListboxDescriptionProps) {
	return <OptionDescription data-slot="listbox-description" className={cn(className)} {...props} />
}
