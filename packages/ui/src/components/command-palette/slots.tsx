import type React from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Alert, AlertDescription, type AlertProps } from '../alert'

const k = katachi.commandPalette

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

export type CommandPaletteEmptyProps = Omit<AlertProps, 'variant' | 'color' | 'children'> & {
	children?: React.ReactNode
}

export function CommandPaletteEmpty({ children, ...props }: CommandPaletteEmptyProps) {
	return (
		<Alert variant="soft" color="amber" className="mt-2" {...props}>
			<AlertDescription>{children}</AlertDescription>
		</Alert>
	)
}
