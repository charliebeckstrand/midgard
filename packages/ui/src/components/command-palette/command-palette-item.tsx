'use client'

import { type ReactNode, useId } from 'react'
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

// Href discrimination comes from the shared PolymorphicProps; the render stays
// custom (sanctioned escape hatch) because an item carries role="option" /
// roving tabindex and closes the palette on activation — behaviour the generic
// Polymorphic doesn't cover.
export type CommandPaletteItemProps = CommandPaletteItemBaseProps &
	PolymorphicProps<'button', keyof CommandPaletteItemBaseProps>

export function CommandPaletteItem(props: CommandPaletteItemProps) {
	const { close } = useCommandPaletteContext()

	const { component: LinkComponent } = useLink()

	// Stable id so the input's aria-activedescendant can point at the active item.
	const itemId = useId()

	const { disabled, className, children, onAction, closeOnAction = true } = props

	function handleSelect() {
		if (disabled) return

		onAction?.()

		if (closeOnAction) close()
	}

	// Attributes common to both renders. Forwarded props (incl. `href`) are
	// spread per branch via forwardedProps, which keeps the polymorphic union
	// narrowed — a single hoisted rest would mix anchor/button members.
	const optionProps = {
		id: itemId,
		role: 'option' as const,
		tabIndex: -1,
		'data-slot': 'command-palette-item',
		'data-disabled': disabled || undefined,
		className: cn(k.item, className),
		onClick: handleSelect,
	}

	if (props.href !== undefined) {
		return (
			<LinkComponent {...optionProps} {...forwardedProps(props)}>
				{children}
			</LinkComponent>
		)
	}

	return (
		<button type="button" {...optionProps} {...forwardedProps(props)}>
			{children}
		</button>
	)
}

/** Drop the item's own props, leaving the host element's attributes to forward. */
function forwardedProps<T extends CommandPaletteItemBaseProps>({
	disabled: _disabled,
	className: _className,
	children: _children,
	onAction: _onAction,
	closeOnAction: _closeOnAction,
	...rest
}: T) {
	return rest
}
