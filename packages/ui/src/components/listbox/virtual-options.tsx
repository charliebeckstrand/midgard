'use client'

import { VirtualOptions, type VirtualOptionsProps } from '../../primitives/virtual-options'

export type ListboxVirtualOptionsProps<T> = VirtualOptionsProps<T>

/**
 * Virtualized options list for `<Listbox>`. Use when rendering >200 options
 * so the DOM only holds the viewport plus overscan.
 *
 * Must be rendered inside a `<Listbox>` — it locates the scroll container
 * via the nearest `role="listbox"` ancestor (the Listbox PopoverPanel).
 *
 * Note: arrow-key roving focus only traverses options currently in the DOM.
 */
export function ListboxVirtualOptions<T>(props: ListboxVirtualOptionsProps<T>) {
	return <VirtualOptions {...props} />
}
