'use client'

import type React from 'react'
import { cn, Link } from '../../core'
import { Kbd, type KbdProps } from '../kbd'
import { useMenuContext } from './menu'
import { k } from './variants'

type MenuItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: React.ReactNode
	onAction?: () => void
}

export type MenuItemProps = MenuItemBaseProps &
	(
		| ({ href: string } & Omit<
				React.ComponentPropsWithoutRef<typeof Link>,
				keyof MenuItemBaseProps
		  >)
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, keyof MenuItemBaseProps>)
	)

export function MenuItem({
	disabled,
	className,
	children,
	onAction,
	href,
	...props
}: MenuItemProps) {
	const { close } = useMenuContext()

	function handleSelect() {
		if (disabled) return
		onAction?.()
		close()
	}

	const classes = cn('group/option', k.item, className)

	if (href) {
		return (
			<Link
				href={href}
				role="menuitem"
				tabIndex={-1}
				aria-disabled={disabled || undefined}
				data-slot="menu-item"
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={handleSelect}
				{...(props as Omit<
					React.ComponentPropsWithoutRef<typeof Link>,
					keyof MenuItemBaseProps | 'href'
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
			aria-disabled={disabled || undefined}
			data-slot="menu-item"
			data-disabled={disabled ? '' : undefined}
			className={classes}
			onClick={handleSelect}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					handleSelect()
				}
			}}
			{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, keyof MenuItemBaseProps>)}
		>
			{children}
		</button>
	)
}

export type MenuLabelProps = React.ComponentPropsWithoutRef<'span'>

export function MenuLabel({ className, ...props }: MenuLabelProps) {
	return <span data-slot="menu-label" className={cn(k.label, className)} {...props} />
}

export type MenuDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function MenuDescription({ className, ...props }: MenuDescriptionProps) {
	return <span data-slot="menu-description" className={cn(k.description, className)} {...props} />
}

export type MenuShortcutProps = KbdProps

export function MenuShortcut({ className, ...props }: MenuShortcutProps) {
	return <Kbd data-slot="menu-shortcut" className={cn(k.shortcut, className)} {...props} />
}
