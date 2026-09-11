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
 * Space activation for a link {@link MenuItem}. An anchor fires its click on
 * Enter natively, so Enter needs nothing here. Space does not, and outside a
 * dropdown the roving model supplies no activation either, so the press falls
 * through and scrolls the page behind the open menu. Forwards a click to the
 * anchor, so Space and Enter take one path — navigation plus the composed
 * `onClick` — and selection is reported once.
 *
 * @internal
 */
export function handleMenuItemLinkKeyDown<E extends HTMLElement>(
	event: KeyboardEvent<E>,
	consumerOnKeyDown: ((event: KeyboardEvent<E>) => void) | undefined,
): void {
	composeEventHandlers(consumerOnKeyDown, (keyEvent) => {
		if (keyEvent.key !== ' ') return

		keyEvent.preventDefault()

		keyEvent.currentTarget.click()
	})(event)
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
