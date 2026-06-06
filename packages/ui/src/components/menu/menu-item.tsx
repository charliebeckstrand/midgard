'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { useLink } from '../../primitives/link'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/menu'
import { useMenuActions } from './context'

type MenuItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: ReactNode
	onAction?: () => void
}

// Href discrimination comes from the shared PolymorphicProps; the render stays
// custom (sanctioned escape hatch) because a menu item carries role / roving
// tabindex / keyboard activation and renders disabled items as a non-anchor
// span — behaviour the generic Polymorphic doesn't cover.
export type MenuItemProps = MenuItemBaseProps & PolymorphicProps<'button', keyof MenuItemBaseProps>

export function MenuItem(props: MenuItemProps) {
	const { close } = useMenuActions()

	const { density, size } = useDensity()

	const { component: LinkComponent } = useLink()

	const { disabled, className, children, onAction } = props

	function handleSelect() {
		if (disabled) return

		onAction?.()
		close()
	}

	const classes = cn('group/option', k.item({ density, size }), className)

	if (props.href !== undefined) {
		// Anchors with href stay navigable via middle-click, Cmd-click, and "Open
		// in new tab" — none fire onClick. Render disabled items without an
		// anchor so those paths don't exist.
		if (disabled) {
			return (
				<span
					role="menuitem"
					tabIndex={-1}
					aria-disabled={true}
					data-slot="menu-item"
					data-disabled={true}
					className={classes}
				>
					{children}
				</span>
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
			<LinkComponent
				role="menuitem"
				tabIndex={-1}
				data-slot="menu-item"
				className={classes}
				onClick={handleSelect}
				{...rest}
			>
				{children}
			</LinkComponent>
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
			data-disabled={disabled || undefined}
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
