import { isValidElement } from 'react'
import { Icon } from '../icon'

// An "icon" child is the library's <Icon>, a raw <svg>, or any element with
// data-slot="icon". Anything else is treated as a textual label for sizing.
export function isIconElement(node: unknown): boolean {
	if (!isValidElement(node)) return false

	if (node.type === Icon || node.type === 'svg') return true

	const props = node.props as { 'data-slot'?: unknown }

	return props['data-slot'] === 'icon'
}
