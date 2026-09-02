import { ITEM_SELECTOR } from './tree-constants'

/** Standard ARIA roving-tabindex: only the active item is in the tab order. */
export function setActiveItem(container: HTMLElement, target: HTMLElement) {
	const items = container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)

	for (const item of items) item.tabIndex = item === target ? 0 : -1
}

/**
 * Keep the first treeitem tabbable as the rendered set changes (open/close,
 * search, expand-all) without disturbing an already-active item.
 */
export function ensureFirstItemActive(container: HTMLElement) {
	const items = Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR))

	const first = items[0]

	if (first === undefined || items.some((item) => item.tabIndex === 0)) return

	setActiveItem(container, first)
}
