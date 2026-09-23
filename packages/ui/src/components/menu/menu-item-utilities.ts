import type { KeyboardEvent, MouseEvent } from 'react'
import { composeEventHandlers } from '../../core'

/**
 * Composed click activation for a menu item: runs the consumer's `onClick`
 * first, then selection (`onAction` + close). A no-op when disabled.
 *
 * @internal
 */
export function handleMenuItemClick<E extends HTMLElement>(
	event: MouseEvent<E>,
	consumerOnClick: ((event: MouseEvent<E>) => void) | undefined,
	onSelect: () => void,
	disabled?: boolean,
): void {
	if (disabled) return

	composeEventHandlers(consumerOnClick, onSelect, { checkForDefaultPrevented: false })(event)
}

/**
 * Keyboard counterpart to {@link handleMenuItemClick}: runs the consumer's
 * `onKeyDown` first, then activates selection on Enter / Space unless the
 * consumer already handled the event (`defaultPrevented`). A no-op when
 * disabled, so disabled items stay inert on the keyboard path too.
 *
 * @internal
 */
export function handleMenuItemKeyDown<E extends HTMLElement>(
	event: KeyboardEvent<E>,
	consumerOnKeyDown: ((event: KeyboardEvent<E>) => void) | undefined,
	onSelect: () => void,
	disabled?: boolean,
): void {
	if (disabled) return

	composeEventHandlers(consumerOnKeyDown, (keyEvent) => {
		if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
			keyEvent.preventDefault()

			onSelect()
		}
	})(event)
}

/**
 * Space activation for a menu link row. Runs the consumer's `onKeyDown`
 * first. Then Space cancels the page scroll and clicks the anchor, so the
 * row navigates and selects as a pointer click does. Enter stays native.
 *
 * @remarks
 * The click is the activation that the row exists to perform, so a consumer
 * `preventDefault()` does not cancel it (CONVENTIONS §3.9).
 *
 * @internal
 */
export function handleMenuLinkKeyDown<E extends HTMLElement>(
	event: KeyboardEvent<E>,
	consumerOnKeyDown: ((event: KeyboardEvent<E>) => void) | undefined,
): void {
	composeEventHandlers(
		consumerOnKeyDown,
		(keyEvent) => {
			if (keyEvent.key !== ' ') return

			keyEvent.preventDefault()

			keyEvent.currentTarget.click()
		},
		{ checkForDefaultPrevented: false },
	)(event)
}
