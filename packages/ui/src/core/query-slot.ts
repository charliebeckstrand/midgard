/**
 * Locates the element stamped `data-slot="<slot>"` whose `data-<attr>` equals
 * `id`, scoped to `container` so concurrent instances with overlapping ids
 * cannot cross-match. Keyboard-reorder hooks use it to re-find an item by a
 * stable id after a state update re-renders the DOM.
 */
export function querySlot(
	container: ParentNode | null,
	slot: string,
	attr: string,
	id: string,
): HTMLElement | null {
	return (
		container?.querySelector<HTMLElement>(
			`[data-slot="${slot}"][data-${attr}="${CSS.escape(id)}"]`,
		) ?? null
	)
}
