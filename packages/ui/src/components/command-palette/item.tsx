'use client'

import type React from 'react'
import { cn, Link } from '../../core'
import { katachi } from '../../recipes'
import { useCommandPaletteContext } from './context'

const k = katachi.commandPalette

type CommandPaletteItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: React.ReactNode
	onAction?: () => void
	/** Whether the palette should close after the action runs. Defaults to true. */
	closeOnAction?: boolean
}

export type CommandPaletteItemProps = CommandPaletteItemBaseProps &
	(
		| ({ href: string } & Omit<
				React.ComponentPropsWithoutRef<typeof Link>,
				keyof CommandPaletteItemBaseProps
		  >)
		| ({ href?: never } & Omit<
				React.ComponentPropsWithoutRef<'button'>,
				keyof CommandPaletteItemBaseProps
		  >)
	)

export function CommandPaletteItem({
	disabled,
	className,
	children,
	onAction,
	closeOnAction = true,
	href,
	...props
}: CommandPaletteItemProps) {
	const { close } = useCommandPaletteContext()

	function handleSelect() {
		if (disabled) return

		onAction?.()

		if (closeOnAction) close()
	}

	const classes = cn(k.item, className)

	if (href) {
		return (
			<Link
				href={href}
				role="option"
				tabIndex={-1}
				data-slot="command-palette-item"
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={handleSelect}
				{...(props as Omit<
					React.ComponentPropsWithoutRef<typeof Link>,
					keyof CommandPaletteItemBaseProps | 'href'
				>)}
			>
				{children}
			</Link>
		)
	}

	return (
		<button
			type="button"
			role="option"
			tabIndex={-1}
			data-slot="command-palette-item"
			data-disabled={disabled ? '' : undefined}
			className={classes}
			onClick={handleSelect}
			{...(props as Omit<
				React.ComponentPropsWithoutRef<'button'>,
				keyof CommandPaletteItemBaseProps
			>)}
		>
			{children}
		</button>
	)
}

export type CommandPaletteLabelProps = React.ComponentPropsWithoutRef<'span'>

export function CommandPaletteLabel({ className, ...props }: CommandPaletteLabelProps) {
	return <span data-slot="command-palette-label" className={cn(k.label, className)} {...props} />
}

export type CommandPaletteDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function CommandPaletteDescription({ className, ...props }: CommandPaletteDescriptionProps) {
	return (
		<span
			data-slot="command-palette-description"
			className={cn(k.description, className)}
			{...props}
		/>
	)
}

export type CommandPaletteShortcutProps = React.ComponentPropsWithoutRef<'kbd'>

export function CommandPaletteShortcut({ className, ...props }: CommandPaletteShortcutProps) {
	return (
		<kbd data-slot="command-palette-shortcut" className={cn(k.shortcut, className)} {...props} />
	)
}
