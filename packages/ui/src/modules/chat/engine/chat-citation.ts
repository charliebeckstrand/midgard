/**
 * The adapters that read the `selector` of a citation for one kind of view.
 * A selector is `unknown`, because the chat cannot know what an agent sent.
 * Each adapter checks the shape and gives the selection prop of its view, or
 * `undefined` for a selector it does not know. A view that gets `undefined`
 * then selects nothing, which is the safe answer for a payload the app did
 * not expect.
 *
 * An adapter imports nothing from the module of its view. The chat thus pays
 * for no chart, and the chart knows nothing of the chat.
 */

/**
 * The categories that a citation selects in a cartesian chart, for its
 * `selectedCategories`. The selector is `{ categories: string[] }`. Each value
 * matches the raw category as text, as `selectedCategories` reads it.
 *
 * @param selector - The `selector` of a citation.
 * @returns The categories, or `undefined` when the selector has another shape.
 * @example
 *   <BarChart selectedCategories={cited?.target === 'late-by-day' ? toCategorySelection(cited.selector) : undefined} />
 */
export function toCategorySelection(selector: unknown): readonly string[] | undefined {
	return stringList(selector, 'categories')
}

/**
 * The regions that a citation selects in a map, for the `selectedRegions` of
 * `MapPlat`. The selector is `{ regions: string[] }`. Each value is the id of
 * a region, as `selectedRegions` reads it.
 *
 * @param selector - The `selector` of a citation.
 * @returns The region ids, or `undefined` when the selector has another shape.
 * @example
 *   <MapPlat selectedRegions={cited?.target === 'late-by-state' ? toRegionSelection(cited.selector) : undefined} />
 */
export function toRegionSelection(selector: unknown): readonly string[] | undefined {
	return stringList(selector, 'regions')
}

/**
 * One stop that a citation selects on a map: the `id` of the `MapPoints` set,
 * and the index of the stop in the points that the app gave the set. It has
 * the shape of a `MapOverlaySelection`, so the result goes to `selectedOverlays`
 * as it is.
 */
export type ChatStopSelection = { id: string; index: number }

/**
 * The stops that a citation selects on a map, for the `selectedOverlays` of
 * `MapPlat`. The selector is `{ stops: string[] }`, and each value is the key
 * of a row of the app.
 *
 * @remarks
 * The agent names a stop by the key of its row, because it cannot know the
 * index of the stop. The index counts the points that the app gives to
 * `MapPoints`, and it changes when a filter changes those points. Thus the app
 * gives `getIndex`, made from the same rows that it gives to `MapPoints`. A key
 * for which `getIndex` gives `undefined` selects nothing. That is what the map
 * does for a pair that names no stop that it draws.
 *
 * @param selector - The `selector` of a citation.
 * @param overlay - The `id` of the `MapPoints` set that draws the stops.
 * @param getIndex - Gives the index of the row with a key, in the points of the set.
 * @returns The stops, or `undefined` when the selector has another shape.
 * @example
 *   const getIndex = (key: string) => indexByKey.get(key)
 *
 *   <MapPlat selectedOverlays={cited?.target === 'late-stops' ? toStopSelection(cited.selector, 'stops', getIndex) : undefined}>
 *     <MapPoints id="stops" points={rows} />
 *   </MapPlat>
 */
export function toStopSelection(
	selector: unknown,
	overlay: string,
	getIndex: (key: string) => number | undefined,
): readonly ChatStopSelection[] | undefined {
	const keys = stringList(selector, 'stops')

	if (keys === undefined) return undefined

	return keys.flatMap((key) => {
		const index = getIndex(key)

		return index === undefined ? [] : [{ id: overlay, index }]
	})
}

/**
 * The list of strings in the field `key` of a selector, or `undefined` when the
 * selector is not an object or the field is not a list of strings.
 *
 * @internal
 */
function stringList(selector: unknown, key: string): readonly string[] | undefined {
	if (typeof selector !== 'object' || selector === null) return undefined

	const list: unknown = (selector as Record<string, unknown>)[key]

	if (!Array.isArray(list)) return undefined

	return list.every((item) => typeof item === 'string') ? list : undefined
}
