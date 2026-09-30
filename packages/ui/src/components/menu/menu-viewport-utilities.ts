import type { FloatingHeightSnap } from '../../hooks'

/**
 * Lowers the height of a floating menu panel that does not fit, so that the
 * last visible row is cut at its middle. A clipped row shows that more rows
 * are below, and the edge fade alone does not. A panel that fits keeps the
 * available height. The `capped` recipe cap follows the same rule.
 *
 * The positions are read in the coordinates of the scrolled content, so the
 * current cap and the scroll position do not change the result.
 *
 * @internal
 */
export const snapMenuHeight: FloatingHeightSnap = (available, floating) => {
	const viewport = floating.querySelector<HTMLElement>('[data-slot="menu-viewport"]')

	if (!viewport) return available

	const box = floating.getBoundingClientRect()

	const view = viewport.getBoundingClientRect()

	// The panel chrome above and below the viewport, which does not shrink.
	const limit = available - (view.top - box.top) - (box.bottom - view.bottom)

	if (viewport.scrollHeight <= limit) return available

	const origin = view.top - viewport.scrollTop

	let cut = 0

	for (const row of viewport.querySelectorAll('[role="menuitem"]')) {
		const rect = row.getBoundingClientRect()

		const middle = rect.top - origin + rect.height / 2

		if (middle > limit) break

		cut = middle
	}

	return cut > 0 ? available - (limit - cut) : available
}
