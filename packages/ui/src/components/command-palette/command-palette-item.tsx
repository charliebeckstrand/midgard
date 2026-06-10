'use client'

import { type MouseEvent, type ReactNode, useId } from 'react'
import { cn } from '../../core'
import { useLink } from '../../primitives/link'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/command-palette'
import { useCommandPaletteContext } from './context'

type CommandPaletteItemBaseProps = {
	disabled?: boolean
	className?: string
	children?: ReactNode
	onAction?: () => void
	/** Closes the palette after the action. Defaults to true. */
	closeOnAction?: boolean
}

// Href discrimination comes from the shared PolymorphicProps. Rendered custom:
// carries `role="option"`, roving tabindex, and palette-close on activation.
export type CommandPaletteItemProps = CommandPaletteItemBaseProps &
	PolymorphicProps<'button', keyof CommandPaletteItemBaseProps>

export function CommandPaletteItem(props: CommandPaletteItemProps) {
	const { close } = useCommandPaletteContext()

	const { component: LinkComponent } = useLink()

	// Stable id; the input's aria-activedescendant points at the active item.
	const itemId = useId()

	const { disabled, className, children, onAction, closeOnAction = true } = props

	const onClick = (props as { onClick?: (e: MouseEvent<HTMLElement>) => void }).onClick

	function handleSelect(e: MouseEvent<HTMLElement>) {
		// The disabled guard runs before the consumer handler: disabled items
		// are inert on every input path, and preventDefault keeps disabled
		// link items from navigating.
		if (disabled) {
			e.preventDefault()

			return
		}

		// The consumer handler runs first, then selection/close.
		onClick?.(e)

		onAction?.()

		if (closeOnAction) close()
	}

	// Attributes shared by both render branches; host-element props spread per
	// branch via `forwardedProps`, keeping the polymorphic union narrowed. They
	// come first; the option wiring below wins on collision.
	const optionProps = {
		id: itemId,
		role: 'option' as const,
		tabIndex: -1,
		'data-slot': 'command-palette-item',
		'data-disabled': disabled || undefined,
		'aria-disabled': disabled || undefined,
		className: cn(k.item, className),
		onClick: handleSelect,
	}

	if (props.href !== undefined) {
		return (
			<LinkComponent {...forwardedProps(props)} {...optionProps}>
				{children}
			</LinkComponent>
		)
	}

	return (
		<button type="button" {...forwardedProps(props)} {...optionProps}>
			{children}
		</button>
	)
}

/** Drop the item's own props, leaving the host element's attributes to forward. */
function forwardedProps<T extends CommandPaletteItemBaseProps & { onClick?: unknown }>({
	disabled: _disabled,
	className: _className,
	children: _children,
	onAction: _onAction,
	closeOnAction: _closeOnAction,
	onClick: _onClick,
	...rest
}: T) {
	return rest
}
