import type React from 'react'
import { cn } from '../../core'
import {
	dropdownHeadingVariants,
	dropdownSectionVariants,
	dropdownSeparatorVariants,
} from './variants'

export type DropdownSectionProps = React.ComponentPropsWithoutRef<'fieldset'>

export function DropdownSection({ className, ...props }: DropdownSectionProps) {
	return (
		<fieldset
			data-slot="dropdown-section"
			className={cn(dropdownSectionVariants(), className)}
			{...props}
		/>
	)
}

export type DropdownHeadingProps = React.ComponentPropsWithoutRef<'div'>

export function DropdownHeading({ className, ...props }: DropdownHeadingProps) {
	return (
		<div
			data-slot="dropdown-heading"
			className={cn(dropdownHeadingVariants(), className)}
			{...props}
		/>
	)
}

export type DropdownSeparatorProps = React.ComponentPropsWithoutRef<'hr'>

export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
	return (
		<hr
			data-slot="dropdown-separator"
			className={cn(dropdownSeparatorVariants(), className)}
			{...props}
		/>
	)
}
