/**
 * Best-effort accessible name of a DOM element: its `aria-label`, the trimmed
 * text of its `aria-labelledby` targets, else its own trimmed text. For
 * imperative reads at event time, e.g. naming a card/column when announcing a
 * keyboard drag; not a substitute for the full accessible-name algorithm.
 *
 * @remarks `aria-labelledby` can hold a list of IDs. The texts of the targets
 * that resolve join with one space, in list order. The element's own text
 * applies only when no ID resolves. The own text leaves out each descendant
 * that is `hidden` or `aria-hidden`, as the accessible name does. Such a node
 * names something only when an `aria-labelledby` names it directly.
 */
export function accessibleName(el: Element | null): string {
	if (!el) return ''

	const label = el.getAttribute('aria-label')

	if (label) return label

	const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? []

	const targets = ids.flatMap((id) => el.ownerDocument.getElementById(id) ?? [])

	if (targets.length === 0) return shownText(el).trim()

	return targets
		.map((target) => (target.textContent ?? '').trim())
		.filter(Boolean)
		.join(' ')
}

/** The text of `node`, less each descendant element that is `hidden` or `aria-hidden`. */
function shownText(node: Node): string {
	let text = ''

	for (const child of node.childNodes) {
		if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? ''
		else if (
			child.nodeType === Node.ELEMENT_NODE &&
			!(child as Element).hasAttribute('hidden') &&
			(child as Element).getAttribute('aria-hidden') !== 'true'
		)
			text += shownText(child)
	}

	return text
}
