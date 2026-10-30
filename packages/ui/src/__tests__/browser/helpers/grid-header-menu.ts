import { fireEvent, present } from '../../helpers'

/** Clicks the first menu item on the page whose text `matches` accepts. */
function clickMenuItem(matches: (text: string) => boolean, name: string): void {
	const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((candidate) =>
		matches(candidate.textContent ?? ''),
	)

	fireEvent.click(present(item, name))
}

/**
 * Runs a width action from the header menu of a Grid column.
 *
 * The width actions sit under the Auto-size parent of the menu. The helper opens
 * the menu on the header, opens that parent, then clicks the item.
 *
 * @param root - The node that holds the grid.
 * @param columnId - The `data-grid-col` of the header.
 * @param label - Text in the item to click, such as `Auto-size this column`.
 */
export function menuAction(root: ParentNode, columnId: string, label: string): void {
	const selector = `th[data-grid-col="${columnId}"]`

	fireEvent.contextMenu(present(root.querySelector(selector), selector))

	clickMenuItem((text) => text.trim() === 'Auto-size', 'the Auto-size menu')

	clickMenuItem((text) => text.includes(label), `the ${label} item`)
}
