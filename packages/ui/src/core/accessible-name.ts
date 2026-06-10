/**
 * Best-effort accessible name of a DOM element: its `aria-label`, the trimmed
 * text of its `aria-labelledby` target, else its own trimmed text. For
 * imperative reads at event time, e.g. naming a card/column when announcing a
 * keyboard drag; not a substitute for the full accessible-name algorithm.
 */
export function accessibleName(el: Element | null): string {
	if (!el) return ''

	const label = el.getAttribute('aria-label')

	if (label) return label

	const labelledby = el.getAttribute('aria-labelledby')

	const target = labelledby ? el.ownerDocument.getElementById(labelledby) : null

	return (target?.textContent ?? el.textContent ?? '').trim()
}
