/**
 * Names a DOM node the way a reader can find it again.
 *
 * Shared by the two guards in this directory, which both print nodes into a
 * failure message and must agree on the form: a rename of the slot convention,
 * or another attribute worth showing, is then one edit rather than two.
 */
export function describeNode(node: Element | null): string {
	if (!node) return 'none'

	const slot = node.getAttribute('data-slot')

	const testId = node.getAttribute('data-testid')

	return [
		node.tagName.toLowerCase(),
		slot && `[data-slot="${slot}"]`,
		testId && `[data-testid="${testId}"]`,
	]
		.filter(Boolean)
		.join('')
}
