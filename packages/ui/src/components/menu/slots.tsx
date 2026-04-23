import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type MenuSectionProps = ComponentPropsWithoutRef<'fieldset'>

export function MenuSection({ className, ...props }: MenuSectionProps) {
	return <fieldset data-slot="menu-section" className={cn(k.section, className)} {...props} />
}

export type MenuHeadingProps = ComponentPropsWithoutRef<'legend'>

export function MenuHeading({ className, ...props }: MenuHeadingProps) {
	return <legend data-slot="menu-heading" className={cn(k.heading, className)} {...props} />
}

export type MenuSeparatorProps = ComponentPropsWithoutRef<'hr'>

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
	return <hr data-slot="menu-separator" className={cn(k.separator, className)} {...props} />
}
