'use client'

import { VirtualOptions, type VirtualOptionsProps } from '../../primitives/virtual-options'

export type ComboboxVirtualOptionsProps<T> = VirtualOptionsProps<T>

/**
 * Virtualized options list for `<Combobox>`. Use when rendering >200 options
 * so the DOM only holds the viewport plus overscan.
 *
 * Must be rendered inside a `<Combobox>` — it locates the scroll container
 * via the nearest `role="listbox"` ancestor (the Combobox PopoverPanel).
 *
 * Note: arrow-key roving focus only traverses options currently in the DOM.
 * For large lists, users navigate by typing to filter.
 */
export function ComboboxVirtualOptions<T>(props: ComboboxVirtualOptionsProps<T>) {
	return <VirtualOptions {...props} />
}
