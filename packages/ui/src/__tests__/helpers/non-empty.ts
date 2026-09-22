/**
 * Assert a list holds at least one item, and return it typed as non-empty.
 *
 * A loop, an `every`, or a `not.toContain` over an empty list passes with
 * nothing checked. A query that matches nothing makes that list: a renamed
 * slot, or a subtree that did not render. `nonEmpty` fails at the query
 * instead, as {@link present} does for one node.
 *
 * An exact `toHaveLength(n)` is the stronger check where the render fixes the
 * count, because it also fails when one item is missing. Use `nonEmpty` where
 * the count changes with the frame, as with axis labels that thin to fit.
 *
 * @param items - The items, as an array or as the `NodeList` of a `querySelectorAll`.
 * @param what - A short name for one item, used in the failure message.
 * @returns The items as an array, typed so that the first index is defined.
 * @throws If `items` holds no item.
 */
export function nonEmpty<T>(items: Iterable<T>, what: string): [T, ...T[]] {
	const list = Array.from(items)

	if (list.length === 0) throw new Error(`expected at least one ${what}`)

	return list as [T, ...T[]]
}
