import type React from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.dropdown

export type DropdownSectionProps = React.ComponentPropsWithoutRef<'fieldset'>

export function DropdownSection({ className, ...props }: DropdownSectionProps) {
	return <fieldset data-slot="dropdown-section" className={cn(k.section, className)} {...props} />
}

export type DropdownHeadingProps = React.ComponentPropsWithoutRef<'div'>

export function DropdownHeading({ className, ...props }: DropdownHeadingProps) {
	return <div data-slot="dropdown-heading" className={cn(k.heading, className)} {...props} />
}

export type DropdownSeparatorProps = React.ComponentPropsWithoutRef<'hr'>

export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
	return <hr data-slot="dropdown-separator" className={cn(k.separator, className)} {...props} />
}
