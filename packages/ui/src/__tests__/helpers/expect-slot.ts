import { expect } from 'vitest'
import { bySlot } from './slot-queries'

/**
 * Assert an element with the given `data-slot` is in the document — and
 * optionally that it rendered as a specific tag — then return it, narrowed
 * to `HTMLElement` for follow-up assertions.
 */
export function expectSlot(container: HTMLElement, name: string, tag?: string): HTMLElement {
	const el = bySlot(container, name)

	expect(el).toBeInTheDocument()

	if (tag) {
		expect(el?.tagName).toBe(tag.toUpperCase())
	}

	return el as HTMLElement
}
