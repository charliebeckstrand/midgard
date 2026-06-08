import type { MouseEvent } from 'react'
import { k } from '../../recipes/kata/button'

export const buttonSpring = {
	whileTap: { scale: 0.95 },
	transition: k.motion,
} as const

// `aria-disabled` alone doesn't gate a link, so a loading anchor cancels its own
// activation: block navigation (next/link bails on `defaultPrevented`) and
// swallow the event so the consumer's `onClick` can't fire.
function cancelActivation(e: MouseEvent<HTMLAnchorElement>) {
	e.preventDefault()

	e.stopPropagation()
}

/**
 * Props that gate a loading anchor — out of the tab order and with activation
 * cancelled, mirroring the disabled `<button>` branch. Shared by the standard
 * and headless renderers so the two can't drift.
 */
export const loadingLinkProps = {
	'aria-disabled': true,
	'data-disabled': true,
	'aria-busy': true,
	tabIndex: -1,
	onClick: cancelActivation,
} as const
