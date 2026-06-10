import type { MouseEvent } from 'react'
import { k } from '../../recipes/kata/button'

export const buttonSpring = {
	whileTap: { scale: 0.95 },
	transition: k.motion,
} as const

// A loading anchor blocks navigation (`defaultPrevented` stops next/link) and
// swallows the event; the consumer's `onClick` does not fire.
function cancelActivation(e: MouseEvent<HTMLAnchorElement>) {
	e.preventDefault()

	e.stopPropagation()
}

/**
 * Props that gate a loading anchor: out of the tab order and with activation
 * cancelled, mirroring the disabled `<button>` branch. Shared by the standard
 * and headless renderers.
 */
export const loadingProps = {
	'aria-disabled': true,
	'data-disabled': true,
	'aria-busy': true,
	tabIndex: -1,
	onClick: cancelActivation,
} as const
