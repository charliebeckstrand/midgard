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
	if (typeof selector !== 'object' || selector === null) return undefined

	const categories: unknown = (selector as { categories?: unknown }).categories

	if (!Array.isArray(categories)) return undefined

	return categories.every((category) => typeof category === 'string') ? categories : undefined
}
