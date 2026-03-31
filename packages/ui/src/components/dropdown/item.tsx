'use client'

import type React from 'react'
import { cn, Link } from '../../core'
import { useDropdownContext } from './dropdown'
import {
	dropdownDescriptionVariants,
	dropdownItemVariants,
	dropdownLabelVariants,
	dropdownShortcutVariants,
} from './variants'

type DropdownItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: React.ReactNode
	onAction?: () => void
}

export type DropdownItemProps = DropdownItemBaseProps &
	(
		| ({ href: string } & Omit<
				React.ComponentPropsWithoutRef<typeof Link>,
				keyof DropdownItemBaseProps
		  >)
		| ({ href?: never } & Omit<
				React.ComponentPropsWithoutRef<'button'>,
				keyof DropdownItemBaseProps
		  >)
	)

export function DropdownItem({
	disabled,
	className,
	children,
	onAction,
	href,
	...props
}: DropdownItemProps) {
	const { close } = useDropdownContext()

	function handleSelect() {
		if (disabled) return
		onAction?.()
		close()
	}

	const classes = cn('group/option', dropdownItemVariants(), className)

	if (href) {
		return (
			<Link
				href={href}
				role="menuitem"
				tabIndex={-1}
				data-slot="dropdown-item"
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={handleSelect}
				{...(props as Omit<
					React.ComponentPropsWithoutRef<typeof Link>,
					keyof DropdownItemBaseProps | 'href'
				>)}
			>
				{children}
			</Link>
		)
	}

	return (
		<button
			type="button"
			role="menuitem"
			tabIndex={-1}
			data-slot="dropdown-item"
			data-disabled={disabled ? '' : undefined}
			className={classes}
			onClick={handleSelect}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					handleSelect()
				}
			}}
			{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, keyof DropdownItemBaseProps>)}
		>
			{children}
		</button>
	)
}

export type DropdownLabelProps = React.ComponentPropsWithoutRef<'span'>

export function DropdownLabel({ className, ...props }: DropdownLabelProps) {
	return (
		<span
			data-slot="dropdown-label"
			className={cn(dropdownLabelVariants(), className)}
			{...props}
		/>
	)
}

export type DropdownDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function DropdownDescription({ className, ...props }: DropdownDescriptionProps) {
	return (
		<span
			data-slot="dropdown-description"
			className={cn(dropdownDescriptionVariants(), className)}
			{...props}
		/>
	)
}

export type DropdownShortcutProps = React.ComponentPropsWithoutRef<'kbd'>

export function DropdownShortcut({ className, ...props }: DropdownShortcutProps) {
	return (
		<kbd
			data-slot="dropdown-shortcut"
			className={cn(dropdownShortcutVariants(), className)}
			{...props}
		/>
	)
}
