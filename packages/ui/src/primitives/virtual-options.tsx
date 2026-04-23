'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { type ReactNode, useRef } from 'react'

export type VirtualOptionsProps<T> = {
	/** Items to render. The current filtered/sorted set, in order. */
	items: T[]
	/** Row height in pixels. Assumes uniform heights — defaults to 36. */
	estimateSize?: number
	/** How many rows to render outside the viewport. Defaults to 10. */
	overscan?: number
	/** Render function for each item. */
	children: (item: T, index: number) => ReactNode
}

/**
 * Virtualized list for option lists inside a `PopoverPanel` (Combobox, Listbox).
 *
 * Finds its scroll container via the nearest `role="listbox"` ancestor, which
 * matches PopoverPanel's DOM. Renders only rows in the viewport plus overscan;
 * the rest are represented by top/bottom spacer divs.
 *
 * Assumes uniform item heights. Keyboard arrow-key navigation only traverses
 * options currently in the DOM — users of large lists should filter by typing.
 */
export function VirtualOptions<T>({
	items,
	estimateSize = 36,
	overscan = 10,
	children,
}: VirtualOptionsProps<T>) {
	const containerRef = useRef<HTMLDivElement>(null)

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => containerRef.current?.closest<HTMLElement>('[role="listbox"]') ?? null,
		estimateSize: () => estimateSize,
		overscan,
	})

	const virtualItems = virtualizer.getVirtualItems()

	const totalSize = virtualizer.getTotalSize()

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems[virtualItems.length - 1]

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	return (
		<div ref={containerRef} data-slot="virtual-options">
			{topSpacer > 0 && <div data-slot="virtual-options-spacer" style={{ height: topSpacer }} />}
			{virtualItems.map((vi) => {
				const item = items[vi.index] as T

				return children(item, vi.index)
			})}
			{bottomSpacer > 0 && (
				<div data-slot="virtual-options-spacer" style={{ height: bottomSpacer }} />
			)}
		</div>
	)
}
