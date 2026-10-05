/**
 * The features that the app can turn on and off. A feature that is off shows
 * no control and does no work, and its code stays in the app until the flag
 * goes on again or the feature goes away.
 */
export const flags: Readonly<Record<'visitedRegions', boolean>> = {
	/**
	 * The regions that the reader marks visited: the Visited toggle in the
	 * header, the Mark visited command in the search, the "Visited or not"
	 * filter, and the paint that the filter puts on the map.
	 */
	visitedRegions: false,
}
