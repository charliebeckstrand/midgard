'use client'

import { type KeyboardEvent, type MouseEvent, type ReactNode, useId } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
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
	/** Runs on selection (click or Enter/Space), then closes the menu. */
	onAction?: () => void
}

/** Props for {@link MenuItem}: a base set plus polymorphic `<button>`/anchor attributes; `href` switches it to a link. */
// Href discrimination comes from the shared PolymorphicProps. Rendered custom:
// carries role, roving tabindex, and keyboard activation; a disabled link
// degrades to an inert non-anchor `<span>`, a disabled button to an
// `aria-disabled` `<button>`.
export type MenuItemProps = MenuItemBaseProps & PolymorphicProps<'button', keyof MenuItemBaseProps>

/**
 * Selectable `role="menuitem"`. Renders an anchor when `href` is set (keeping
 * middle-click and open-in-new-tab working), a `<button>` otherwise. A disabled
 * link degrades to an inert `<span>`; a disabled button stays a `<button>` with
 * `aria-disabled`. Fires `onAction` and closes the menu on click or Enter/Space.
 */
export function MenuItem(props: MenuItemProps) {
	const { close } = useMenuActions()

	const { space, size } = useDensity()

	const { component: LinkComponent } = useLink()

	const { disabled, className, children, onAction } = props

	// A stable id so a dropdown's `aria-activedescendant` (roving with focus on the
	// trigger) can point at this row; a consumer-supplied id wins.
	const reactId = useId()

	const id = props.id ?? reactId

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
					id={id}
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
			id: _id,
			disabled: _disabled,
			className: _className,
			children: _children,
			onAction: _onAction,
			onClick: consumerOnClick,
			...rest
		} = props

		return (
			<LinkComponent
				id={id}
				role="menuitem"
				tabIndex={-1}
				data-slot="menu-item"
				className={classes}
				{...rest}
				// Composed after the spread: runs the consumer onClick, then
				// selection (onAction/close).
				onClick={(event: MouseEvent<HTMLAnchorElement>) =>
					handleMenuItemClick(event, consumerOnClick, handleSelect)
				}
			>
				{children}
			</LinkComponent>
		)
	}

	const {
		id: _id,
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
			id={id}
			type="button"
			role="menuitem"
			tabIndex={-1}
			aria-disabled={ariaAttr(disabled)}
			data-slot="menu-item"
			data-disabled={dataAttr(disabled)}
			className={classes}
			{...rest}
			// Composed after the spread: runs consumer handlers, then selection
			// (onAction/close). The disabled guard precedes both so disabled
			// items are inert on every input path.
			onClick={(event: MouseEvent<HTMLButtonElement>) =>
				handleMenuItemClick(event, consumerOnClick, handleSelect, disabled)
			}
			onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
				handleMenuItemKeyDown(event, consumerOnKeyDown, handleSelect, disabled)
			}
		>
			{children}
		</button>
	)
}
