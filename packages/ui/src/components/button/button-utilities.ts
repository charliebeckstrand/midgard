import { isValidElement } from 'react'
import { Icon } from '../icon'

/**
 * Whether a child reads as an icon rather than a textual label, deciding square
 * vs. control height. True for the library's `<Icon>`, a raw `<svg>`, or any
 * element carrying `data-slot="icon"`; everything else counts as a label.
 *
 * @returns `true` when `node` is an icon element, `false` otherwise.
 * @see {@link Button} for the labeled-vs-icon-only sizing branch it feeds.
 * @internal
 */
export function isIconElement(node: unknown): boolean {
	if (!isValidElement(node)) return false

	if (node.type === Icon || node.type === 'svg') return true

	const props = node.props as { 'data-slot'?: unknown }

	return props['data-slot'] === 'icon'
}
