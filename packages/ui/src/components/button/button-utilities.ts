import { isValidElement } from 'react'
import { Icon } from '../icon'

// An "icon" child is the library's <Icon>, a raw <svg>, or any element that
// opts into the convention by carrying data-slot="icon". Anything else passed
// as children is treated as a textual label for sizing purposes.
export function isIconElement(node: unknown): boolean {
	if (!isValidElement(node)) return false

	if (node.type === Icon || node.type === 'svg') return true

	const props = node.props as { 'data-slot'?: unknown }

	return props['data-slot'] === 'icon'
}
