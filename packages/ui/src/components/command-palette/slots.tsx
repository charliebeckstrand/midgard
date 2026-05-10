import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/command-palette'
import { Alert, type AlertProps } from '../alert'

export type CommandPaletteGroupProps = ComponentPropsWithoutRef<'div'> & {
	heading?: ReactNode
}

export function CommandPaletteGroup({
	heading,
	className,
	children,
	...props
}: CommandPaletteGroupProps) {
	return (
		<div data-slot="command-palette-group" className={cn(k.group, className)} {...props}>
			{heading && (
				<div data-slot="command-palette-heading" className={cn(k.heading)}>
					{heading}
				</div>
			)}
			{children}
		</div>
	)
}

export type CommandPaletteEmptyProps = AlertProps

export function CommandPaletteEmpty({ children, ...props }: CommandPaletteEmptyProps) {
	return (
		<Alert data-slot="command-palette-empty" {...props}>
			{children}
		</Alert>
	)
}
