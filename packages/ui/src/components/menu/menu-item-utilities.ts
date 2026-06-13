import type { KeyboardEvent, MouseEvent } from 'react'

// Composed activation for a menu item: run the consumer's handler first, then
// selection (onAction + close). Both paths short-circuit when disabled; the
// keyboard path additionally activates on Enter / Space once the consumer
// hasn't already handled the event.
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
