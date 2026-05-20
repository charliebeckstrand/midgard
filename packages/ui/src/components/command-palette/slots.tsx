import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/command-palette'
import { Alert, type AlertProps } from '../alert'
import { Kbd, type KbdProps } from '../kbd'

export type CommandPaletteGroupProps = ComponentPropsWithoutRef<'div'> & {
	title?: ReactNode
}

export function CommandPaletteGroup({
	title,
	className,
	children,
	...props
}: CommandPaletteGroupProps) {
	return (
		<div data-slot="command-palette-group" className={cn(k.group, className)} {...props}>
			{title && (
				<div data-slot="command-palette-title" className={cn(k.title)}>
					{title}
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

export type CommandPaletteLabelProps = ComponentPropsWithoutRef<'span'>

export function CommandPaletteLabel({ className, ...props }: CommandPaletteLabelProps) {
	return <span data-slot="command-palette-label" className={cn(k.label, className)} {...props} />
}

export type CommandPaletteDescriptionProps = ComponentPropsWithoutRef<'span'>

export function CommandPaletteDescription({ className, ...props }: CommandPaletteDescriptionProps) {
	return (
		<span
			data-slot="command-palette-description"
			className={cn(k.description, className)}
			{...props}
		/>
	)
}

export type CommandPaletteShortcutProps = KbdProps

export function CommandPaletteShortcut({ className, ...props }: CommandPaletteShortcutProps) {
	return (
		<Kbd data-slot="command-palette-shortcut" className={cn(k.shortcut, className)} {...props} />
	)
}
