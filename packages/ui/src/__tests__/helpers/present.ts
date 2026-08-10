/**
 * Assert a queried node is present and return it narrowed to `HTMLElement`.
 *
 * DOM lookups like `closest`, `find`, or `querySelector` return `null` /
 * `undefined` when nothing matches. Guarding the result with `if (!el) return`
 * silently skips the assertions that follow, so a regression that drops the
 * node lets the test still report green. Routing the lookup through `present`
 * fails loudly at the missing node instead.
 *
 * The narrowing defaults to `HTMLElement`, which is what almost every caller
 * wants. A suite reading an SVG interface — a CTM, a stroke's own point test —
 * names the element type instead (`present<SVGGeometryElement>(…)`), so it takes
 * the guard without casting the answer back.
 *
 * @param el - The queried node, possibly absent.
 * @param what - A short description used in the failure message.
 * @returns The node, narrowed to `T`.
 * @throws If `el` is `null` or `undefined`.
 */
export function present<T extends Element = HTMLElement>(
	el: Element | null | undefined,
	what: string,
): T {
	if (!el) throw new Error(`expected ${what} to be present`)

	return el as T
}
