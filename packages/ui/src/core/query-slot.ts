/**
 * Locates the element stamped `data-slot="<slot>"` whose `data-<attr>` equals
 * `id`. Keyboard-reorder hooks use it to re-find an item by stable id after a
 * state update re-renders the DOM.
 */
export function querySlot(slot: string, attr: string, id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(
		`[data-slot="${slot}"][data-${attr}="${CSS.escape(id)}"]`,
	)
}
