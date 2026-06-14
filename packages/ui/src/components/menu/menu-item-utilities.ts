import type { KeyboardEvent, MouseEvent } from 'react'

/**
 * Composed click activation for a menu item: runs the consumer's `onClick`
 * first, then selection (`onAction` + close). A no-op when disabled.
 */
export function handleMenuItemClick<E extends HTMLElement>(
	e: MouseEvent<E>,
	consumerOnClick: ((event: MouseEvent<E>) => void) | undefined,
	onSelect: () => void,
	disabled?: boolean,
): void {
	if (disabled) return

	consumerOnClick?.(e)

	onSelect()
}

/**
 * Keyboard counterpart to {@link handleMenuItemClick}: runs the consumer's
 * `onKeyDown` first, then activates selection on Enter / Space unless the
 * consumer already handled the event (`defaultPrevented`). A no-op when
 * disabled, so disabled items stay inert on the keyboard path too.
 */
export function handleMenuItemKeyDown<E extends HTMLElement>(
	e: KeyboardEvent<E>,
	consumerOnKeyDown: ((event: KeyboardEvent<E>) => void) | undefined,
	onSelect: () => void,
	disabled?: boolean,
): void {
	if (disabled) return

	consumerOnKeyDown?.(e)

	if (e.defaultPrevented) return

	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault()

		onSelect()
	}
}
