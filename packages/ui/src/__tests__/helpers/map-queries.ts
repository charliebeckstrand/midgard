/**
 * The region paths of a map. A region anchors on `data-region-index`, which
 * the scroll-settle resolve of the hover provider reads, and not on a
 * `data-slot` for each region. The stylesheet holds `[data-slot=…]` selectors
 * for other components. With a slot, each path of a county atlas would pay
 * for those selectors at the first style resolution, for an anchor that no
 * rule styles. The layer keeps its `map-regions` slot.
 */
export function allRegions(container: HTMLElement) {
	return Array.from(container.querySelectorAll<SVGPathElement>('[data-region-index]'))
}

/**
 * A lit layer of the region map while it shows, or `null`. A lift keeps the
 * layer through the fade of the recede and then hides it with `invisible`, so a
 * hidden layer counts as gone.
 */
export function shownLayer(
	container: HTMLElement,
	slot: 'map-regions-lit' | 'map-regions-emphasized',
): Element | null {
	const layer = container.querySelector(`[data-slot="${slot}"]`)

	return layer?.classList.contains('invisible') ? null : layer
}

/** The first region path, or `null`, as `querySelector` gives it. */
export function firstRegion(container: HTMLElement) {
	return container.querySelector<SVGPathElement>('[data-region-index]')
}

/**
 * Each row of the visually hidden data table as a pair of its name and its
 * `aria-current`, in the order that a reader meets them. The regions come
 * first, then one row for each overlay stop.
 *
 * It reads the row header, not the `tr`. The table puts `aria-current` on the
 * header because support for the attribute on a plain `tr` is uneven. Thus the
 * region pick and the overlay pick assert one contract through one reader.
 */
export function tableRows(container: HTMLElement) {
	return Array.from(container.querySelectorAll('[data-slot="map-table"] tbody th')).map((cell) => [
		cell.textContent,
		cell.getAttribute('aria-current'),
	])
}

/**
 * The scale of a transformed layer, from its `transform` attribute.
 *
 * A layer with no transform gives `1`, the identity. Thus a caller can
 * multiply by the result whether or not the layer has a transform.
 * `transformAttribute` rounds to three decimals, so read the result to three
 * places and no more.
 */
export function layerScale(element: Element | null | undefined): number {
	const match = /scale\((-?[\d.]+)\)/.exec(element?.getAttribute('transform') ?? '')

	return match?.[1] === undefined ? 1 : Number(match[1])
}
