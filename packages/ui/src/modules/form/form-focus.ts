import { getTabbableElements } from '../../utilities/focusable-selector'

/**
 * Compares two elements by their position in the document. An element that
 * comes before another sorts first.
 *
 * @internal
 */
function byDocumentOrder(a: Element, b: Element): number {
	return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

/**
 * Sorts `items` by the position of their elements in the document, with the
 * comparator of {@link focusFirstControl}. `getElement` gives the element of
 * an item. An item with no element keeps its order, after the items that have
 * one.
 *
 * @returns A new array. The function does not change `items`.
 * @internal
 */
export function sortByDocumentOrder<T>(
	items: readonly T[],
	getElement: (item: T) => Element | null | undefined,
): T[] {
	const placed: { item: T; element: Element }[] = []

	const unplaced: T[] = []

	for (const item of items) {
		const element = getElement(item)

		if (element) placed.push({ item, element })
		else unplaced.push(item)
	}

	placed.sort((a, b) => byDocumentOrder(a.element, b.element))

	return [...placed.map(({ item }) => item), ...unplaced]
}

/**
 * Moves the focus to the control with the id `id` in `doc`, and tells whether
 * the focus moved into it.
 *
 * @remarks Some controls put the id of their field on a wrapper, such as the
 * row of a `Rating` or a `RadioGroup`. When the element with the id does not
 * take the focus, the first element in it that is in the tab order takes it.
 * In a set of radios, that is the checked radio, as for Tab.
 *
 * A control can pass the focus on to the element that shows it, such as the
 * hidden input of a file upload to its visible trigger. Thus focus that the
 * call moves to a different element also counts as focus in the control.
 * @internal
 */
export function focusControl(doc: Document, id: string): boolean {
	const target = doc.getElementById(id)

	if (!target) return false

	const previous = doc.activeElement

	target.focus()

	if (doc.activeElement === target) return true

	if (doc.activeElement !== previous && doc.activeElement !== doc.body) return true

	getTabbableElements(target)[0]?.focus()

	return target.contains(doc.activeElement)
}

/**
 * Moves the focus to the first control, in the order of the document, of the
 * fields in `names` that takes the focus. `ids` gives the control id of each
 * field that registered one. A field with no registered control, with no
 * element, or with a control that does not take the focus, such as a disabled
 * one, is skipped.
 *
 * @internal
 */
export function focusFirstControl(
	doc: Document,
	names: Iterable<string>,
	ids: Readonly<Record<string, { id: string } | undefined>>,
): void {
	const targets: HTMLElement[] = []

	for (const name of names) {
		const target = ids[name] && doc.getElementById(ids[name].id)

		if (target) targets.push(target)
	}

	targets.sort(byDocumentOrder)

	for (const target of targets) if (focusControl(doc, target.id)) return
}
