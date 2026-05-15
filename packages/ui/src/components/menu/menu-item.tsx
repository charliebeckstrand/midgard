'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/concentric'
import { k } from '../../recipes/kata/menu'
import { Link } from '../link'
import { useMenuActions } from './context'

type MenuItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: ReactNode
	onAction?: () => void
}

export type MenuItemProps = MenuItemBaseProps &
	(
		| ({ href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, keyof MenuItemBaseProps>)
		| ({ href?: never } & Omit<ComponentPropsWithoutRef<'button'>, keyof MenuItemBaseProps>)
	)

export function MenuItem(props: MenuItemProps) {
	const { close } = useMenuActions()

	const size = useResolvedSize()

	const { disabled, className, children, onAction } = props

	function handleSelect() {
		if (disabled) return
		onAction?.()
		close()
	}

	const classes = cn('group/option', k.item({ size }), className)

	if (props.href !== undefined) {
		const {
			disabled: _disabled,
			className: _className,
			children: _children,
			onAction: _onAction,
			...rest
		} = props

		return (
			<Link
				role="menuitem"
				tabIndex={-1}
				aria-disabled={disabled || undefined}
				data-slot="menu-item"
				data-disabled={disabled ? '' : undefined}
				className={classes}
				onClick={handleSelect}
				{...rest}
			>
				{children}
			</Link>
		)
	}

	const {
		disabled: _disabled,
		className: _className,
		children: _children,
		onAction: _onAction,
		...rest
	} = props

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
			{...rest}
		>
			{children}
		</button>
	)
}
