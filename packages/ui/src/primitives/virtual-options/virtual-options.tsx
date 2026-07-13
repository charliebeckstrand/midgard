'use client'

import { type ReactNode, use, useCallback, useEffect, useMemo, useRef } from 'react'
import { useVirtualWindow } from '../../hooks'
import type { VirtualItemSource } from '../../hooks/a11y/use-a11y-roving'
import { VirtualItemSourceContext } from './virtual-item-source-context'

/**
 * Nearest ancestor with a scrollable `overflow-y`, regardless of whether it is
 * currently overflowing — unlike a scroll-into-view search, the virtualizer
 * needs this element even before any rows are measured (it decides how many
 * rows to render from this element's bounded height in the first place, so
 * "is it already overflowing" isn't yet decidable). `role="listbox"` isn't a
 * reliable landmark for it: `ComboboxPanel`/`ListboxPanel` put the scrollable
 * `overflow-y-auto` + `max-h-*` styling on the floating panel that *wraps*
 * the `role="listbox"` element, not on that element itself.
 *
 * A *definite* height (not just a `max-height` cap) on this ancestor —
 * `ComboboxPanel`/`ListboxPanel` already carry one — matters when nothing else
 * gives it a floor: `max-height` alone bounds the *upper* end, so an ancestor
 * that otherwise sizes to its content (e.g. `CommandPalette`'s `DialogBody`,
 * `min-h-0 overflow-y-auto` with no `flex-grow`) collapses to 0 with nothing
 * rendered yet — 0 content height, 0 rendered rows, 0 content height, forever.
 * Wrap `VirtualOptions` in an explicit-height `overflow-y-auto` div there.
 *
 * @internal
 */
function findScrollableAncestor(node: HTMLElement | null): HTMLElement | null {
	let el = node?.parentElement ?? null

	while (el) {
		const { overflowY } = getComputedStyle(el)

		if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return el

		el = el.parentElement
	}

	return null
}

/**
 * Per-row a11y attributes {@link VirtualOptions} passes to `children`: the
 * windowed list's true size and the row's 1-based position in it, since a
 * windowed `role="listbox"` otherwise loses "n of m" context for screen
 * readers (only the rendered rows are in the accessibility tree). Spread onto
 * the rendered option.
 */
export type VirtualOptionMeta = {
	'aria-setsize': number
	'aria-posinset': number
}

/**
 * Props for {@link VirtualOptions}.
 *
 * @typeParam T - Item type; flows through to the `children` render function.
 */
export type VirtualOptionsProps<T> = {
	/** Items to render. The current filtered/sorted set, in order. */
	items: T[]
	/**
	 * Row height in pixels. Assumes uniform heights.
	 *
	 * @defaultValue 36
	 */
	estimateSize?: number
	/**
	 * How many rows to render outside the viewport.
	 *
	 * @defaultValue 10
	 */
	overscan?: number
	/**
	 * Stable id for the option at `index`, matching the `id` the rendered
	 * option carries. Registers a keyboard-navigable item source with the
	 * nearest roving owner (`Combobox`, `CommandPalette`), so arrow / type-ahead
	 * reach options outside the rendered window instead of stopping at its
	 * edge. Omit to keep the prior DOM-only-roving behavior.
	 */
	getOptionId?: (item: T, index: number) => string
	/** Whether the option at `index` is disabled; a registered item source skips it during navigation. */
	isDisabled?: (item: T, index: number) => boolean
	/** Text value for type-ahead matching at `index`, read off `item` instead of the (possibly unmounted) DOM row. */
	getTextValue?: (item: T, index: number) => string
	/** Render function for each item, given the a11y `meta` to spread onto the rendered option. */
	children: (item: T, index: number, meta: VirtualOptionMeta) => ReactNode
}

/**
 * Virtualized list for option lists inside a `PopoverPanel` (Combobox, Listbox).
 *
 * Finds its scroll container by walking up to the nearest ancestor with a
 * scrollable `overflow-y` — `PopoverPanel`'s own `overflow-y-auto` + `max-h-*`
 * styling, which every select-like panel already carries, not the plain
 * `role="listbox"` element `PopoverPanel` wraps. Renders only rows in the
 * viewport plus overscan; the rest are represented by top/bottom spacer divs.
 * Passes `aria-setsize` / `aria-posinset` to `children` so a screen reader
 * still reports the true "n of m" position for a windowed-out row.
 *
 * With `getOptionId`, registers a keyboard-navigable item source with the
 * nearest roving owner (`Combobox`, `CommandPalette`): arrow / type-ahead
 * navigate by index and scroll the target into the window, reaching options
 * outside it. Without it, keyboard navigation stays DOM-only, capped at the
 * rendered window (the pre-existing behavior).
 *
 * @remarks Assumes uniform item heights.
 * @typeParam T - Item type passed to `children`.
 */
export function VirtualOptions<T>({
	items,
	estimateSize = 36,
	overscan = 10,
	getOptionId,
	isDisabled,
	getTextValue,
	children,
}: VirtualOptionsProps<T>) {
	const containerRef = useRef<HTMLDivElement>(null)

	// The scroll container is stable while mounted, but the virtualizer calls
	// `getScrollElement` after every commit (its own layout effect plus
	// `useVirtualWindow`'s resync guard) — including each scroll-driven window
	// change. Cache the resolved element so the getComputedStyle-per-ancestor
	// walk runs once, not per scroll frame; re-walk only if the cached node
	// left the document (panel remount).
	const scrollElementRef = useRef<HTMLElement | null>(null)

	const getScrollElement = useCallback(() => {
		const cached = scrollElementRef.current

		if (cached?.isConnected) return cached

		scrollElementRef.current = findScrollableAncestor(containerRef.current)

		return scrollElementRef.current
	}, [])

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex } = useVirtualWindow({
		count: items.length,
		getScrollElement,
		estimateSize,
		overscan,
	})

	const source = useMemo<VirtualItemSource | null>(() => {
		if (!getOptionId) return null

		return {
			count: items.length,
			getKey: (index) => getOptionId(items[index] as T, index),
			isDisabled: isDisabled ? (index) => isDisabled(items[index] as T, index) : undefined,
			getTextValue: getTextValue ? (index) => getTextValue(items[index] as T, index) : undefined,
			scrollToIndex,
		}
	}, [items, getOptionId, isDisabled, getTextValue, scrollToIndex])

	const registryRef = use(VirtualItemSourceContext)

	useEffect(() => {
		if (!registryRef) return

		registryRef.current = source

		return () => {
			registryRef.current = null
		}
	}, [registryRef, source])

	return (
		// role="presentation" flattens this wrapper and the spacers out of
		// the a11y tree; the listbox ancestor owns the option rows directly.
		<div ref={containerRef} role="presentation" data-slot="virtual-options">
			{topSpacer > 0 && (
				<div role="presentation" data-slot="virtual-options-spacer" style={{ height: topSpacer }} />
			)}
			{virtualItems.map((virtualItem) => {
				const item = items[virtualItem.index] as T

				return children(item, virtualItem.index, {
					'aria-setsize': items.length,
					'aria-posinset': virtualItem.index + 1,
				})
			})}
			{bottomSpacer > 0 && (
				<div
					role="presentation"
					data-slot="virtual-options-spacer"
					style={{ height: bottomSpacer }}
				/>
			)}
		</div>
	)
}
