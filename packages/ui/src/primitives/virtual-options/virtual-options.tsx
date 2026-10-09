'use client'

import { type ReactNode, use, useCallback, useEffect, useMemo, useRef } from 'react'
import { dataAttr } from '../../core'
import { useVirtualWindow } from '../../hooks'
import type { VirtualItemSource } from '../../hooks/a11y/use-a11y-roving'
import { useStableEvent } from '../../hooks/use-stable-event'
import { VirtualItemSourceContext } from './context'

/**
 * Nearest ancestor with a scrollable `overflow-y`, regardless of whether it is
 * currently overflowing. Unlike a scroll-into-view search, the virtualizer needs
 * this element even before any rows are measured. It decides how many rows to
 * render from this element's bounded height in the first place, so "is it
 * already overflowing" isn't yet decidable. The `role="listbox"` isn't a
 * reliable landmark for it. `ComboboxPanel`/`ListboxPanel` put the scrollable
 * `overflow-y-auto` + `max-h-*` styling on the floating panel that *wraps*
 * the `role="listbox"` element, not on that element itself.
 *
 * A *definite* height on this ancestor matters when nothing else gives it a
 * floor. A `max-height` cap alone is not enough, and
 * `ComboboxPanel`/`ListboxPanel` already carry a definite height. The cap bounds
 * the *upper* end only. An ancestor that otherwise sizes to its content
 * therefore collapses to 0 with nothing rendered yet. That is 0 content height,
 * 0 rendered rows, 0 content height, forever. `CommandPalette`'s `DialogBody` is
 * such an ancestor, at `min-h-0 overflow-y-auto` with no `flex-grow`. Wrap
 * `VirtualOptions` in an explicit-height `overflow-y-auto` div there.
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
 * windowed list's true size, and the row's 1-based position in it. A windowed
 * `role="listbox"` otherwise loses "n of m" context for screen readers, because
 * only the rendered rows are in the accessibility tree. Spread onto
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
	 * The first guess at the height of a row, in pixels. Each rendered row
	 * measures its real height, so the guess only places the rows that have not
	 * rendered yet. A guess near the real height keeps the scrollbar steady.
	 *
	 * @defaultValue 36
	 */
	estimateSize?: number
	/**
	 * Stable id for the option at `index`, matching the `id` the rendered
	 * option carries. Registers a keyboard-navigable item source with the
	 * nearest roving owner (`Listbox`, `Combobox`, `CommandPalette`). Arrow /
	 * type-ahead therefore reach options outside the rendered window, instead of
	 * stopping at its edge. The id is also the key of the measured height of the
	 * row, so a height stays with its option when the list filters. Omit to keep
	 * the prior DOM-only-roving behavior. The index is then the key.
	 */
	getOptionId?: (item: T, index: number) => string
	/** Whether the option at `index` is disabled; a registered item source skips it during navigation. */
	isDisabled?: (item: T, index: number) => boolean
	/** Text value for type-ahead matching at `index`, read off `item` instead of the (possibly unmounted) DOM row. */
	getTextValue?: (item: T, index: number) => string
	/** Render function for each item, given the a11y `meta` to spread onto the rendered option. */
	children: (item: T, index: number, meta: VirtualOptionMeta) => ReactNode
}

// Rows rendered outside the viewport on each side. Fixed for option lists,
// whose rows are small.
const OVERSCAN = 10

/**
 * Virtualized list for option lists inside a `PopoverPanel` (Combobox, Listbox)
 * or a `CommandPalette`.
 *
 * Finds its scroll container by walking up to the nearest ancestor with a
 * scrollable `overflow-y`. In a select-like panel, that is `PopoverPanel`'s own
 * `overflow-y-auto` + `max-h-*` styling, not the plain `role="listbox"` element
 * `PopoverPanel` wraps. A `CommandPalette` has no such panel, so the caller
 * gives `VirtualOptions` a wrapper with a definite height and `overflow-y:
 * auto`, as the `children` TSDoc of the palette tells. Renders only rows in the
 * viewport plus overscan; the rest are represented by top/bottom spacer divs.
 * Each rendered row sits in a presentational wrapper that measures its real
 * height. A row height changes with the density and with a description line,
 * so the window and `scrollToIndex` follow the rows and not `estimateSize`.
 * Passes `aria-setsize` / `aria-posinset` to `children` so a screen reader
 * still reports the true "n of m" position for a windowed-out row.
 *
 * With `getOptionId`, registers a keyboard-navigable item source with the
 * nearest roving owner (`Listbox`, `Combobox`, `CommandPalette`). Arrow /
 * type-ahead then navigate by index and scroll the target into the window,
 * reaching options outside it. Without it, keyboard navigation stays DOM-only, capped at the
 * rendered window (the pre-existing behavior).
 *
 * @typeParam T - Item type passed to `children`.
 */
export function VirtualOptions<T>({
	items,
	estimateSize = 36,
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

	const getItemKey = useCallback(
		(index: number) => (getOptionId ? getOptionId(items[index] as T, index) : index),
		[items, getOptionId],
	)

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex, measureRef } = useVirtualWindow({
		count: items.length,
		getScrollElement,
		estimateSize,
		overscan: OVERSCAN,
		getItemKey,
	})

	// The source runs these in events and effects, never in render, so each keeps
	// one identity, and an inline callback of a consumer does not build a new
	// source on each render. The source holds one only while its prop is there,
	// so no fallback runs.
	const getKey = useStableEvent((index: number) => getOptionId?.(items[index] as T, index) ?? '')

	const isIndexDisabled = useStableEvent(
		(index: number) => isDisabled?.(items[index] as T, index) ?? false,
	)

	const getIndexText = useStableEvent(
		(index: number) => getTextValue?.(items[index] as T, index) ?? '',
	)

	const hasOptionId = getOptionId !== undefined

	const hasIsDisabled = isDisabled !== undefined

	const hasTextValue = getTextValue !== undefined

	const source = useMemo<VirtualItemSource | null>(() => {
		if (!hasOptionId) return null

		return {
			count: items.length,
			getKey,
			isDisabled: hasIsDisabled ? isIndexDisabled : undefined,
			getTextValue: hasTextValue ? getIndexText : undefined,
			scrollToIndex,
		}
	}, [
		items,
		hasOptionId,
		getKey,
		hasIsDisabled,
		isIndexDisabled,
		hasTextValue,
		getIndexText,
		scrollToIndex,
	])

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
		//
		// `data-empty` is the emptiness signal for the listbox ancestor. The
		// wrapper mounts even at zero items, because the scroll-ancestor walk
		// needs `containerRef`, so the listbox is never CSS `:empty` under
		// virtualization and a bare `:empty` rule can never fire.
		<div
			ref={containerRef}
			role="presentation"
			data-slot="virtual-options"
			data-empty={dataAttr(items.length === 0)}
		>
			{topSpacer > 0 && (
				<div role="presentation" data-slot="virtual-options-spacer" style={{ height: topSpacer }} />
			)}
			{virtualItems.map((virtualItem) => (
				<div
					key={virtualItem.key}
					ref={measureRef}
					role="presentation"
					data-slot="virtual-options-row"
					data-index={virtualItem.index}
				>
					{children(items[virtualItem.index] as T, virtualItem.index, {
						'aria-setsize': items.length,
						'aria-posinset': virtualItem.index + 1,
					})}
				</div>
			))}
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
