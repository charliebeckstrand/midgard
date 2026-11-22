import { FOCUSABLE_SELECTOR } from '../../utilities/focusable-selector'

/**
 * Moves the focus to the control with the id `id` in `doc`.
 *
 * @remarks Some controls put the id of their field on a wrapper, such as the
 * row of a `Rating`. When the element with the id does not take the focus, the
 * first element in it that is in the tab order takes it.
 * @internal
 */
export function focusControl(doc: Document, id: string): void {
	const target = doc.getElementById(id)

	if (!target) return

	target.focus()

	if (doc.activeElement === target) return

	target.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
}

/**
 * Moves the focus to the first control, in the order of the document, of the
 * fields in `names`. `ids` gives the control id of each field that registered
 * one. A field with no registered control, or with no element, is skipped.
 *
 * @internal
 */
export function focusFirstControl(
	doc: Document,
	names: Iterable<string>,
	ids: Readonly<Record<string, { id: string } | undefined>>,
): void {
	let first: HTMLElement | undefined

	for (const name of names) {
		const target = ids[name] && doc.getElementById(ids[name].id)

		if (!target) continue

		// A target that comes before `first` in the document takes its place.
		if (!first || target.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)
			first = target
	}

	if (first) focusControl(doc, first.id)
}
