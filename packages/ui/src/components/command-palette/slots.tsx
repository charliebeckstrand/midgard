import type React from 'react'
import { cn } from '../../core'
import { Alert } from '../alert'
import { k } from './variants'

export type CommandPaletteGroupProps = React.ComponentPropsWithoutRef<'div'> & {
	heading?: React.ReactNode
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

export type CommandPaletteEmptyProps = React.ComponentPropsWithoutRef<'div'>

export function CommandPaletteEmpty({ children }: CommandPaletteEmptyProps) {
	return <Alert data-slot="command-palette-empty">{children}</Alert>
}
