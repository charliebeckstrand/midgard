import { FOCUSABLE_SELECTOR } from '../../utilities/focusable-selector'

/**
 * Moves the focus to the control with the id `id` in `doc`, and tells whether
 * the focus moved into it.
 *
 * @remarks Some controls put the id of their field on a wrapper, such as the
 * row of a `Rating`. When the element with the id does not take the focus, the
 * first element in it that is in the tab order takes it.
 * @internal
 */
export function focusControl(doc: Document, id: string): boolean {
	const target = doc.getElementById(id)

	if (!target) return false

	target.focus()

	if (doc.activeElement === target) return true

	target.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()

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

	// A target that comes before another in the document sorts first.
	targets.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))

	for (const target of targets) if (focusControl(doc, target.id)) return
}
