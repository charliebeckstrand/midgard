'use client'

/**
 * The one rule for a horizontal arrow key in a right-to-left layout.
 *
 * A control whose items follow the reading order mirrors in a right-to-left
 * layout, so its keys mirror too (WAI-ARIA APG). There, `ArrowLeft` moves to
 * the next item and `ArrowRight` to the previous one. A tree branch opens on
 * `ArrowLeft`, and a calendar day grid steps forward on `ArrowLeft`. Every
 * handler that reads a horizontal arrow as a step in the reading order calls
 * {@link logicalArrowKey}. `useA11yRoving` calls it for each of its users.
 *
 * A control on a physical axis does not call it. A slider track, a color area,
 * a map, and a chart axis do not mirror, so `ArrowRight` still moves right.
 * `logical-arrow-boundary.test.ts` holds every other file to this rule.
 *
 * The direction is read from the computed style at the time of the key press,
 * not kept in context. A `dir` change on any ancestor therefore applies to the
 * next key press.
 */

/**
 * Whether an element lays out right to left: its computed `direction`. A value
 * that is not an element, such as a synthetic event target, reads as left to
 * right.
 *
 * @internal
 */
export function isRtl(element: EventTarget | null): boolean {
	return element instanceof Element && getComputedStyle(element).direction === 'rtl'
}

/**
 * The key a horizontal arrow means in the reading order: `ArrowLeft` and
 * `ArrowRight` swap when `rtl` is true. Other keys come back unchanged.
 * `Home` and `End` already name the start and the end of the order.
 *
 * @internal
 */
export function logicalArrow(key: string, rtl: boolean): string {
	if (!rtl) return key

	if (key === 'ArrowLeft') return 'ArrowRight'

	return key === 'ArrowRight' ? 'ArrowLeft' : key
}

/**
 * The key a horizontal arrow means in the reading order of `element`. It reads
 * the direction only for `ArrowLeft` and `ArrowRight`, so other keys cost no
 * style read.
 *
 * The swap is its own inverse. `logicalArrowKey('ArrowRight', element)` is
 * therefore also the physical key that steps forward in `element`.
 *
 * @internal
 */
export function logicalArrowKey(key: string, element: EventTarget | null): string {
	if (key !== 'ArrowLeft' && key !== 'ArrowRight') return key

	return logicalArrow(key, isRtl(element))
}
