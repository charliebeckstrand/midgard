'use client'

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { useLink } from '../../primitives/link'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/menu'
import { useMenuActions } from './context'
import { handleMenuItemClick, handleMenuItemKeyDown } from './menu-item-utilities'

type MenuItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: ReactNode
	onAction?: () => void
}

// Href discrimination comes from the shared PolymorphicProps. Rendered custom:
// carries role, roving tabindex, and keyboard activation; renders disabled
// items as a non-anchor `<span>`.
export type MenuItemProps = MenuItemBaseProps & PolymorphicProps<'button', keyof MenuItemBaseProps>

export function MenuItem(props: MenuItemProps) {
	const { close } = useMenuActions()

	const { space, size } = useDensity()

	const { component: LinkComponent } = useLink()

	const { disabled, className, children, onAction } = props

	function handleSelect() {
		if (disabled) return

		onAction?.()

		close()
	}

	const classes = cn('group/option', k.item({ density: space, size }), className)

	if (props.href !== undefined) {
		// Anchors with `href` are navigable via middle-click, Cmd-click, and
		// "Open in new tab", none of which fire `onClick`. Disabled items render
		// as a `<span>` with no `href`.
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
			onClick: consumerOnClick,
			...rest
		} = props

		return (
			<LinkComponent
				role="menuitem"
				tabIndex={-1}
				data-slot="menu-item"
				className={classes}
				{...rest}
				// Composed after the spread: runs the consumer onClick, then
				// selection (onAction/close).
				onClick={(e: MouseEvent<HTMLAnchorElement>) =>
					handleMenuItemClick(e, consumerOnClick, handleSelect)
				}
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
		onClick: consumerOnClick,
		onKeyDown: consumerOnKeyDown,
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
			{...rest}
			// Composed after the spread: runs consumer handlers, then selection
			// (onAction/close). The disabled guard precedes both so disabled
			// items are inert on every input path.
			onClick={(e: MouseEvent<HTMLButtonElement>) =>
				handleMenuItemClick(e, consumerOnClick, handleSelect, disabled)
			}
			onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) =>
				handleMenuItemKeyDown(e, consumerOnKeyDown, handleSelect, disabled)
			}
		>
			{children}
		</button>
	)
}
