/**
 * Query the map module's region paths. Regions anchor on `data-region-index` —
 * the attribute the hover provider's scroll-settle resolve reads — rather than
 * a per-region `data-slot`: the stylesheet carries `[data-slot=…]` attribute
 * selectors for other components, so a county atlas's thousands of paths would
 * each pay attribute-rule matching at first style resolution for an anchor
 * nothing styles by. The layer itself keeps its `map-regions` slot.
 */
export function allRegions(container: HTMLElement) {
	return Array.from(container.querySelectorAll<SVGPathElement>('[data-region-index]'))
}

/** The first region path, mirroring `querySelector` semantics. */
export function firstRegion(container: HTMLElement) {
	return container.querySelector<SVGPathElement>('[data-region-index]')
}

/**
 * Each row of the visually-hidden data table as a name / `aria-current` pair, in
 * the order a reader meets them — regions first, then one row per overlay stop.
 *
 * Read off the row header rather than the `tr`: the table puts `aria-current`
 * there deliberately (support for the attribute on a plain `tr` is uneven), so
 * the region pick and the overlay pick assert that one contract through one
 * reader.
 */
export function tableRows(container: HTMLElement) {
	return Array.from(container.querySelectorAll('[data-slot="map-table"] tbody th')).map((cell) => [
		cell.textContent,
		cell.getAttribute('aria-current'),
	])
}
