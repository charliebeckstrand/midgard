/**
 * Reading a hover target back off the DOM. The drawn marks carry their identity
 * in data attributes, and two paths resolve it — the layers' own delegated
 * handlers, and the hover provider's scroll-settle lookup — so both read it
 * here rather than each parsing the attributes for itself.
 *
 * Framework-free like the rest of the engine: these take an `Element` and
 * return data, so they are testable against a bare DOM.
 */

/**
 * The region index under a DOM node, resolved from the `data-region-index`
 * anchor the region paths carry — the one place that reads that anchor, shared
 * by the hover provider's scroll-settle resolve and the region layer's own
 * delegated handlers, so the contract can't drift between them.
 *
 * `null` whenever the node is outside every region, or the anchor doesn't read
 * as an index: a missing attribute must never coerce to region 0 — `Number(null)`
 * is `0` — and a malformed one must never report `NaN` as a target.
 *
 * @internal
 */
export function regionIndexAt(node: EventTarget | Element | null): number | null {
	if (!(node instanceof Element)) return null

	const anchor = node.closest('[data-region-index]')

	if (anchor === null) return null

	const raw = anchor.getAttribute('data-region-index')

	if (raw === null) return null

	return wholeNumber(raw)
}

/**
 * The overlay mark under a DOM node: its id, and which of its stops the node
 * covers. The twin of {@link regionIndexAt} over the `data-entry-id` /
 * `data-entry-stop` pair the hit shapes carry, and the one place that reads
 * them — the hover provider's scroll-settle resolve and the marks' own pointer
 * handlers must never disagree about which dot is under the pointer.
 *
 * A stop that does not read as a whole number falls back to `0` rather than
 * `NaN`: the mark itself is what the anchor found, so its first stop is the
 * honest answer where the ordinal is missing or malformed.
 *
 * @internal
 */
export function markAnchorAt(
	node: EventTarget | Element | null,
): { id: string; stop: number } | null {
	if (!(node instanceof Element)) return null

	const anchor = node.closest('[data-entry-id]')

	const id = anchor?.getAttribute('data-entry-id') ?? null

	if (id === null) return null

	return { id, stop: wholeNumber(anchor?.getAttribute('data-entry-stop') ?? null) ?? 0 }
}

/** A DOM anchor's value as a whole number, or `null` where it is missing or malformed. */
function wholeNumber(raw: string | null): number | null {
	if (raw === null) return null

	const value = Number(raw)

	return Number.isInteger(value) && value >= 0 ? value : null
}
