/**
 * Assert a queried node is present and return it narrowed to `HTMLElement`.
 *
 * DOM lookups like `closest`, `find`, or `querySelector` return `null` /
 * `undefined` when nothing matches. Guarding the result with `if (!el) return`
 * silently skips the assertions that follow, so a regression that drops the
 * node lets the test still report green. Routing the lookup through `present`
 * fails loudly at the missing node instead.
 *
 * @param el - The queried node, possibly absent.
 * @param what - A short description used in the failure message.
 * @returns The node, narrowed to `HTMLElement`.
 * @throws If `el` is `null` or `undefined`.
 */
export function present(el: Element | null | undefined, what: string): HTMLElement {
	if (!el) throw new Error(`expected ${what} to be present`)

	return el as HTMLElement
}
