/**
 * Best-effort accessible name of a DOM element: its `aria-label`, the trimmed
 * text of its `aria-labelledby` targets, else its own trimmed text. For
 * imperative reads at event time, e.g. naming a card/column when announcing a
 * keyboard drag; not a substitute for the full accessible-name algorithm.
 *
 * @remarks `aria-labelledby` can hold a list of IDs. The texts of the targets
 * that resolve join with one space, in list order. The element's own text
 * applies only when no ID resolves.
 */
export function accessibleName(el: Element | null): string {
	if (!el) return ''

	const label = el.getAttribute('aria-label')

	if (label) return label

	const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? []

	const targets = ids.flatMap((id) => el.ownerDocument.getElementById(id) ?? [])

	if (targets.length === 0) return (el.textContent ?? '').trim()

	return targets
		.map((target) => (target.textContent ?? '').trim())
		.filter(Boolean)
		.join(' ')
}
