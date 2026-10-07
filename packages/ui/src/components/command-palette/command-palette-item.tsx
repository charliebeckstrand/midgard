'use client'

import { type MouseEvent, type ReactNode, useId } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useLink } from '../../primitives/link'
import { inertLinkProps } from '../../primitives/link/link-inert'
import { resolveLinkRel } from '../../primitives/link/link-rel'
import { usePanelCloseContext } from '../../primitives/panel'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/command-palette'

type CommandPaletteItemBaseProps = {
	/**
	 * Disables the item, so that it cannot be selected.
	 * @defaultValue false
	 */
	disabled?: boolean
	className?: string
	children?: ReactNode
	/**
	 * Runs when the reader chooses the item: a click, or Enter while the item has
	 * the highlight. It runs after the `onClick` of the item, and then the palette
	 * closes unless `closeOnAction` is false. A disabled item does not run it.
	 */
	onAction?: () => void
	/** Close the palette after the action. @defaultValue true */
	closeOnAction?: boolean
}

// Href discrimination comes from the shared PolymorphicProps. Rendered custom:
// carries `role="option"`, roving tabindex, and palette-close on activation.
/** Props for {@link CommandPaletteItem}; polymorphic over `<button>` and, when `href` is set, the configured Link. */
export type CommandPaletteItemProps = CommandPaletteItemBaseProps &
	PolymorphicProps<'button', keyof CommandPaletteItemBaseProps>

/**
 * Selectable palette entry (`role="option"`): renders a `<button>` or, when
 * `href` is set, a Link anchor, with roving tabindex and the input's
 * active-descendant pointing at it. Runs the consumer `onClick` then
 * `onAction`, closing the palette afterward unless `closeOnAction` is false;
 * `disabled` items are inert on every input path. A disabled link renders an
 * inert `<span>` with no `href`. A press on any row keeps focus on the input:
 * the row cancels the mousedown default after a consumer `onMouseDown` runs.
 * Pass an explicit `id`
 * inside a `VirtualOptions` with `getOptionId`. It overrides the auto-generated
 * one, which React's `useId` mints per instance and cannot predict ahead of the
 * row mounting.
 */
export function CommandPaletteItem(props: CommandPaletteItemProps) {
	const { close } = usePanelCloseContext()

	const { component: LinkComponent } = useLink()

	const autoId = useId()

	// Stable id; the input's aria-activedescendant points at the active item.
	// An explicit `id` wins — set it when rendering inside a `VirtualOptions`
	// with `getOptionId`, which needs a data-driven, predictable id to point
	// `aria-activedescendant` at before the row mounts.
	const itemId = props.id ?? autoId

	const { disabled, className, children, onAction, closeOnAction = true } = props

	const onClick = (props as { onClick?: (event: MouseEvent<HTMLElement>) => void }).onClick

	const onMouseDown = (props as { onMouseDown?: (event: MouseEvent<HTMLElement>) => void })
		.onMouseDown

	// The input holds the query and the arrow keys that move the active
	// descendant, so focus must stay there. A press focuses a `tabIndex={-1}`
	// row unless the row cancels the mousedown default. The consumer handler
	// runs first, and the hold also applies to a disabled row.
	const holdFocus = composeEventHandlers(onMouseDown, (event: MouseEvent<HTMLElement>) =>
		event.preventDefault(),
	)

	function handleSelect(event: MouseEvent<HTMLElement>) {
		// The disabled guard runs before the consumer handler, so disabled
		// items are inert on every input path. A disabled link renders no
		// anchor, so this guard only reaches the button.
		if (disabled) {
			event.preventDefault()

			return
		}

		// The consumer handler runs first, then selection/close.
		onClick?.(event)

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
		onMouseDown: holdFocus,
	}

	if (props.href !== undefined) {
		// Middle-click and "Open in new tab" fire no `click`, so a click guard
		// cannot stop them. A disabled link renders a `<span>` with no `href`,
		// as `MenuItem` does.
		if (disabled) {
			return (
				<span {...inertLinkProps({ ...forwardedProps(props), ...optionProps })}>{children}</span>
			)
		}

		return (
			<LinkComponent
				{...forwardedProps(props)}
				{...optionProps}
				rel={resolveLinkRel(props.target, props.rel)}
			>
				{children}
			</LinkComponent>
		)
	}

	return (
		<button {...forwardedProps(props)} {...optionProps} type="button">
			{children}
		</button>
	)
}

/**
 * Drops the item's own props, leaving the host element's attributes to forward.
 *
 * @internal
 */
function forwardedProps<
	T extends CommandPaletteItemBaseProps & { onClick?: unknown; onMouseDown?: unknown },
>({
	disabled: _disabled,
	className: _className,
	children: _children,
	onAction: _onAction,
	closeOnAction: _closeOnAction,
	onClick: _onClick,
	onMouseDown: _onMouseDown,
	...rest
}: T) {
	return rest
}
