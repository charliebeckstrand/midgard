/**
 * Best-effort accessible name of a DOM element: its `aria-label`, the
 * {@link spokenText} of its `aria-labelledby` targets, else its own spoken
 * text. For imperative reads at event time, e.g. naming a card/column when
 * announcing a keyboard drag; not a substitute for the full accessible-name
 * algorithm.
 *
 * @remarks `aria-labelledby` can hold a list of IDs. The texts of the targets
 * that resolve join with one space, in list order. The element's own text
 * applies only when no ID resolves. The text leaves out each descendant that
 * is `hidden` or `aria-hidden`, as the accessible name does. Such a node names
 * something only when an `aria-labelledby` names it directly.
 */
export function accessibleName(el: Element | null): string {
	if (!el) return ''

	const label = el.getAttribute('aria-label')

	if (label) return label

	const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? []

	const targets = ids.flatMap((id) => el.ownerDocument.getElementById(id) ?? [])

	if (targets.length === 0) return spokenText(el)

	return targets.map(spokenText).filter(Boolean).join(' ')
}

/**
 * The text of `node` as a screen reader speaks it: one space at each edge of a
 * descendant element whose computed `display` is not `inline` or `contents`,
 * each run of white space collapsed to one space, and the ends trimmed. Each
 * descendant element that is `hidden`, `aria-hidden`, or `display: none` is
 * left out.
 *
 * @remarks The text of two blocks joins with a space, as the accessible name
 * from content does. `textContent` joins "Changes saved" and "Your profile is
 * up to date." in two blocks into "Changes savedYour profile is up to date.".
 * Read an announcement from the DOM with this function. `node` itself is not
 * checked, so a hidden `aria-labelledby` target gives its text.
 *
 * @internal
 */
export function spokenText(node: Node): string {
	return walk(node).replace(/\s+/g, ' ').trim()
}

/** The text of `node`, with the spaces of {@link spokenText} but not collapsed. */
function walk(node: Node): string {
	let text = ''

	for (const child of node.childNodes) {
		if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? ''
		else if (child.nodeType === Node.ELEMENT_NODE) text += elementText(child as Element)
	}

	return text
}

/** The text of one descendant element, with a space at each edge of a box that is not inline. */
function elementText(el: Element): string {
	if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return ''

	const display = el.ownerDocument.defaultView?.getComputedStyle(el).display ?? 'inline'

	if (display === 'none') return ''

	const text = walk(el)

	return display === 'inline' || display === 'contents' ? text : ` ${text} `
}
