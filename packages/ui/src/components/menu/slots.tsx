import type React from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.menu

export type MenuSectionProps = React.ComponentPropsWithoutRef<'fieldset'>

export function MenuSection({ className, ...props }: MenuSectionProps) {
	return <fieldset data-slot="menu-section" className={cn(k.section, className)} {...props} />
}

export type MenuHeadingProps = React.ComponentPropsWithoutRef<'legend'>

export function MenuHeading({ className, ...props }: MenuHeadingProps) {
	return <legend data-slot="menu-heading" className={cn(k.heading, className)} {...props} />
}

export type MenuSeparatorProps = React.ComponentPropsWithoutRef<'hr'>

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
	return <hr data-slot="menu-separator" className={cn(k.separator, className)} {...props} />
}
