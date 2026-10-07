'use client'

import { type ComponentProps, type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { keyMatcher, useKeyedStore } from '../../hooks/use-keyed-store'
import { k, type ListVariant } from '../../recipes/kata/list'
import type { Orientation } from '../../types'
import { noop } from '../../utilities'
import { ListContext } from './context'
import { ListItemStatic } from './list-item-static'
import { useListWindow } from './use-list-window'

/**
 * The props that {@link List} and `ListSortable` share.
 *
 * @internal
 */
export type ListBaseProps<T> = Omit<ComponentProps<'ul'>, 'className' | 'children'> & {
	/** Ordered items. */
	items: T[]
	/** Visual variant. `separated` spaces cards apart; `outline` draws one border around the whole list with dividers; `plain` uses dividers only; `solid` renders tinted cards; `bare` spaces rows apart with no chrome, for rows of form controls. @defaultValue 'separated' */
	variant?: ListVariant
	/** Layout axis. @defaultValue 'vertical' */
	orientation?: Orientation
	/** Render function for each item. */
	children: (item: T, index: number) => ReactNode
	className?: string
	'aria-label'?: string
}

/**
 * The `<ul>` of {@link List} and `ListSortable`.
 *
 * @internal
 */
export function ListRoot({
	variant,
	orientation,
	className,
	...props
}: Omit<ComponentProps<'ul'>, 'className'> & {
	variant: ListVariant
	orientation: Orientation
	className?: string
}) {
	return (
		<ul
			{...props}
			data-slot="list"
			data-orientation={orientation}
			className={cn(k.base({ variant, orientation }), className)}
		/>
	)
}

/**
 * Props for {@link List}: the base list surface, the key extractor, and `virtual`.
 *
 * @typeParam T - Shape of a single item.
 */
export type ListProps<T> = ListBaseProps<T> & {
	/** Stable key extractor. Without it, the list keys each item by its index. */
	getKey?: (item: T) => string
	/**
	 * Render only the rows in view, plus a few on each side, in the scroll
	 * region of the nearest panel body. For a long vertical list. See {@link List}.
	 * @defaultValue false
	 */
	virtual?: boolean
}

/**
 * Renders an ordered `items` source as a read-only `<ul>` through a `children`
 * render function, in one of five `variant`s and either orientation. Compose
 * {@link ListItem} (with {@link ListLabel} / {@link ListDescription}) in the
 * render function. For a list that the user reorders, use `ListSortable`.
 * `List` does not load `@dnd-kit`.
 *
 * @remarks
 * Client component.
 *
 * `virtual` renders only the rows in view, plus a few on each side, for a long
 * vertical list. The list windows over the nearest ancestor with
 * `data-scroll-region`, such as the body of a drawer, a sheet, or a dialog, so
 * content above the list scrolls with it. Each row measures its own height, and
 * the list keeps the flex gap between rows. The padding of the list stands in
 * for the rows outside the window. Each row carries `aria-posinset` and
 * `aria-setsize`, because a screen reader cannot count rows that are not in the
 * DOM. A focused row scrolls into view, so Tab reaches the rows past the window.
 * Where no scroll region holds the list, every row renders. Until the scroller
 * lays out, the first twelve rows render: in a server render, in jsdom, and for
 * the one commit before the first paint. A horizontal list ignores `virtual`.
 *
 * @typeParam T - Shape of a single item.
 */
export function List<T>({
	items,
	getKey,
	variant = 'separated',
	orientation = 'vertical',
	virtual = false,
	children,
	...props
}: ListProps<T>) {
	const containerRef = useRef<HTMLUListElement>(null)

	// The fallback reads the position, not the item, so duplicate primitives get
	// distinct keys.
	const effectiveGetKey = useMemo<(item: T, index: number) => string>(
		() => getKey ?? ((_item, index) => String(index)),
		[getKey],
	)

	// A read-only list lifts no item, so the store never changes.
	const liftedStore = useKeyedStore(null, keyMatcher<string>)

	const contextValue = useMemo(
		() => ({
			variant,
			interactive: false,
			disabled: false,
			liftedStore,
			itemCount: items.length,
			handle: false,
			onItemKeyDown: noop,
			onItemBlur: noop,
		}),
		[variant, liftedStore, items.length],
	)

	const getItemKey = useCallback(
		(index: number) => {
			const item = items[index]

			return item === undefined ? index : effectiveGetKey(item, index)
		},
		[items, effectiveGetKey],
	)

	const listWindow = useListWindow({
		enabled: virtual && orientation === 'vertical',
		count: items.length,
		getItemKey,
		listRef: containerRef,
	})

	const rows =
		listWindow.indexes === null
			? items.map((item, index) => {
					const id = effectiveGetKey(item, index)

					return (
						<ListItemStatic key={id} id={id}>
							{children(item, index)}
						</ListItemStatic>
					)
				})
			: // The window counts the same items, so each index names one of them.
				listWindow.indexes.flatMap((index) => {
					const item = items[index]

					if (item === undefined) return []

					const id = effectiveGetKey(item, index)

					return (
						<ListItemStatic
							key={id}
							id={id}
							windowed={{ index, count: items.length, measureRef: listWindow.measureRef }}
						>
							{children(item, index)}
						</ListItemStatic>
					)
				})

	return (
		<ListContext value={contextValue}>
			<ListRoot
				{...props}
				ref={containerRef}
				variant={variant}
				orientation={orientation}
				style={
					listWindow.indexes === null
						? props.style
						: {
								...props.style,
								paddingTop: listWindow.paddingTop,
								paddingBottom: listWindow.paddingBottom,
							}
				}
			>
				{rows}
			</ListRoot>
		</ListContext>
	)
}
