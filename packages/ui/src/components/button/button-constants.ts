import type { MouseEvent } from 'react'

// A loading anchor blocks navigation (`defaultPrevented` stops next/link) and
// swallows the event; the consumer's `onClick` does not fire.
/** @internal */
function cancelActivation(event: MouseEvent<HTMLAnchorElement>) {
	event.preventDefault()

	event.stopPropagation()
}

/**
 * Props that gate a loading anchor: out of the tab order and with activation
 * cancelled, mirroring the disabled `<button>` branch. Shared by the standard
 * and headless renderers.
 *
 * @internal
 */
export const loadingProps = {
	'aria-disabled': true,
	'data-disabled': true,
	'aria-busy': true,
	tabIndex: -1,
	onClick: cancelActivation,
} as const
