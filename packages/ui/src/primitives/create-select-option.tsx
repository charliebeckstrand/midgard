'use client'

import type React from 'react'
import { cn } from '../core'
import { BaseOption, OptionDescription, OptionLabel } from './option'

export type SelectOptionProps = {
	value: unknown
	disabled?: boolean
	icon?: React.ReactNode
	className?: string
	children?: React.ReactNode
}

export type SelectLabelProps = React.ComponentPropsWithoutRef<'span'>

export type SelectDescriptionProps = React.ComponentPropsWithoutRef<'span'>

/**
 * Factory for select-like option components (ComboboxOption, ListboxOption).
 *
 * Both share identical structure: BaseOption + OptionLabel + OptionDescription.
 * Only the data-slot prefix and context hook differ.
 */
export function createSelectOption(config: {
	slotPrefix: string
	useContext: () => {
		value: unknown
		multiple?: boolean
		select: (value: unknown) => void
	}
}) {
	function Option({ value, disabled, icon, className, children }: SelectOptionProps) {
		const { value: selectedValue, multiple, select } = config.useContext()

		const selected =
			multiple && Array.isArray(selectedValue)
				? selectedValue.includes(value)
				: selectedValue === value

		return (
			<BaseOption
				selected={selected}
				disabled={disabled}
				icon={icon}
				checkPosition="end"
				onSelect={() => select(value)}
				data-slot={`${config.slotPrefix}-option`}
				className={className}
			>
				{children}
			</BaseOption>
		)
	}

	function Label({ className, ...props }: SelectLabelProps) {
		return (
			<OptionLabel data-slot={`${config.slotPrefix}-label`} className={cn(className)} {...props} />
		)
	}

	function Description({ className, ...props }: SelectDescriptionProps) {
		return (
			<OptionDescription
				data-slot={`${config.slotPrefix}-description`}
				className={cn(className)}
				{...props}
			/>
		)
	}

	return { Option, Label, Description }
}
