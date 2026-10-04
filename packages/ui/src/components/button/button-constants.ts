import type { MouseEvent } from 'react'

// A loading button or anchor swallows its activation: `defaultPrevented` blocks
// the submission of a form and stops next/link, and the consumer's `onClick`
// does not fire.
/** @internal */
function cancelActivation(event: MouseEvent<HTMLElement>) {
	event.preventDefault()

	event.stopPropagation()
}

/**
 * Props that gate a loading button or anchor. The element stays enabled, so it
 * keeps the focus that it has, and it leaves the tab order. The props cancel
 * each activation:
 *
 * - A click, and the Enter or Space key that clicks the element.
 * - The click that the Enter key in a field sends to the submit button of its form.
 * - The middle click that opens an anchor in a new tab.
 *
 * Shared by the standard and headless renderers.
 *
 * @internal
 */
export const loadingProps = {
	'aria-disabled': true,
	'data-disabled': true,
	'aria-busy': true,
	tabIndex: -1,
	onClick: cancelActivation,
	onAuxClick: cancelActivation,
} as const
