'use client'

import { type ComponentProps, type ReactNode, useCallback, useId, useMemo, useRef } from 'react'
import { cn, dataAttr } from '../../core'
import { keyMatcher, useKeyedStore } from '../../hooks/use-keyed-store'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useReorderDrag } from '../../hooks/use-reorder-drag'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { IntlMessage } from '../../primitives/intl/intl-message'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import { k, type ListVariant } from '../../recipes/kata/list'
import type { Orientation } from '../../types'
import { ListContext } from './context'
import { ListItemReorder } from './list-item-reorder'
import { ListItemStatic } from './list-item-static'
import { listItemName, useListKeyboard } from './use-list-keyboard'
import { useListReorder } from './use-list-reorder'
import { useListWindow } from './use-list-window'

// A reorderable list renders a Motion element, which gives its own meaning to
// `onDrag`, `onDragStart`, `onDragEnd`, and `onAnimationStart`.
type BaseListProps<T> = Omit<
	ComponentProps<'ul'>,
	'children' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
> & {
	/** Ordered items. */
	items: T[]
	/** Visual variant. `separated` spaces cards apart; `outline` draws one border around the whole list with dividers; `plain` uses dividers only; `solid` renders tinted cards; `bare` spaces rows apart with no chrome, for rows of form controls. @defaultValue 'separated' */
	variant?: ListVariant
	/**
	 * Layout axis. A horizontal list stays on one row, which scrolls when it is
	 * wider than its parent.
	 * @defaultValue 'vertical'
	 */
	orientation?: Orientation
	/**
	 * Disables all drag and keyboard reorder interaction. A disabled list with
	 * `onReorder` stamps `data-disabled` on the list and on each row. A read-only
	 * list has no reorder to disable, and stamps neither.
	 * @defaultValue false
	 */
	disabled?: boolean
	/** Render function for each item. */
	children: (item: T, index: number) => ReactNode
}

/**
 * The key extractor of {@link List}. Each arm of {@link ListProps} takes this one
 * declaration, so the API shows one type and one description.
 */
type ListKey<T> = {
	/**
	 * Stable key extractor. A reorderable list requires it to track each row in a drag. A
	 * read-only list can omit it, and then keys each item by its index.
	 */
	getKey?: (item: T) => string
}

/** The reorder callback of {@link List}. Two arms of {@link ListProps} take this one declaration. */
type ListReorder<T> = {
	/**
	 * Fires when the reader reorders the list, with the next ordering. Omit it to
	 * render a list that does not reorder. With `sortable: false`, render a
	 * `<ListHandle>` in each item.
	 */
	onReorder?: (next: T[]) => void
}

/**
 * Props for {@link List}: the base list surface plus the reorder surface.
 *
 * @typeParam T - Shape of a single item.
 * @see {@link List} for the `getKey` requirement on a reorderable list.
 */
export type ListProps<T> = BaseListProps<T> &
	(
		| (Required<ListKey<T>> &
				ListReorder<T> & {
					/**
					 * Inserts a `<ListHandle>` as the first child of each `<ListItem>`. The handle shows only when `onReorder` is set.
					 * @defaultValue true
					 */
					sortable?: true
					virtual?: false
				})
		| (Required<ListKey<T>> &
				Required<ListReorder<T>> & {
					sortable: false
					virtual?: false
				})
		| (ListKey<T> & {
				sortable: false
				onReorder?: undefined
				/**
				 * Renders only the rows in view, plus a few on each side, in the scroll
				 * region of the nearest panel body. For a long read-only vertical list.
				 * See {@link List}.
				 * @defaultValue false
				 */
				virtual?: boolean
		  })
	)

/**
 * An ordered `items` source, rendered as a `<ul>` through a `children` render
 * function, in one of five `variant`s and either orientation. With `onReorder`
 * it becomes reorderable over Motion's `Reorder`, by pointer drag on the handle
 * or keyboard lift (Space then arrows). It auto-inserts a {@link ListHandle}
 * per item unless `sortable: false`. A read-only list (no `onReorder`) shows
 * no handle. A read-only list renders a plain `<ul>` with no drag wiring. Compose {@link ListItem} (with {@link ListLabel} /
 * {@link ListDescription}) in the render function.
 *
 * @remarks
 * Client component. Reorderable lists require a stable `getKey`; the index
 * fallback remounts items mid-drag and breaks keyboard-move refocus. Each
 * reorderable row adds one Tab stop of its own, on its content area when that
 * area activates and on the `<li>` otherwise. A focusable child, such as a
 * checkbox, keeps its own stop (see {@link ListItem}). Only the handle starts a
 * pointer drag. The rows move as the pointer passes them, and the list calls
 * `onReorder` once, on the drop. The box of the list holds the dragged row, so
 * the row does not go over the content around the list. Escape cancels the drag. The list loads no
 * drag library of its own: Motion's `Reorder` runs the drag. `Reorder` loads in
 * a chunk of its own after a reorderable list mounts, so a page with only
 * read-only lists does not load it. Until the chunk arrives, the keyboard
 * reorder works, and a pointer drag does not start.
 *
 * `virtual` renders only the rows in view, plus a few on each side, for a long
 * read-only vertical list. The list windows over the nearest ancestor with
 * `data-scroll-region`, such as the body of a drawer, a sheet, or a dialog, so
 * content above the list scrolls with it. Each row measures its own height, and
 * the list keeps the flex gap between rows. The padding of the list stands in
 * for the rows outside the window. Each row carries `aria-posinset` and
 * `aria-setsize`, because a screen reader cannot count rows that are not in the
 * DOM. A focused row scrolls into view, so Tab reaches the rows past the window.
 * Where no scroll region holds the list, every row renders. Until the scroller
 * lays out, the first twelve rows render: in a server render, in jsdom, and for
 * the one commit before the first paint. A reorderable or horizontal list
 * ignores `virtual`, because a drag needs every row it can pass over.
 *
 * A horizontal list does not wrap, because a drag moves a row along the
 * orientation axis only and cannot reach a row on a second line. The `<ul>` is
 * in a `list-rail` box that scrolls on the inline axis when the row is wider
 * than its parent. A dragged row near an edge of the rail scrolls it. While the
 * rail scrolls, it is a tab stop, and with an `aria-label` on the list it is
 * also a region of that name, so a keyboard user can scroll it.
 *
 * @typeParam T - Shape of a single item.
 */
export function List<T>({
	items,
	getKey,
	onReorder,
	variant = 'separated',
	orientation = 'vertical',
	disabled,
	sortable = true,
	virtual = false,
	children,
	className,
	'aria-label': ariaLabel,
	...props
}: ListProps<T>) {
	const containerRef = useRef<HTMLUListElement>(null)

	const interactive = !disabled && onReorder !== undefined

	// A read-only list has no reorder to disable, so it is never disabled.
	const reorderDisabled = !!disabled && onReorder !== undefined

	// The fallback reads the position, not the item, so duplicate primitives get
	// distinct keys. Only the read-only arm reaches it.
	const effectiveGetKey = useMemo<(item: T, index?: number) => string>(
		() => getKey ?? ((_item, index) => String(index)),
		[getKey],
	)

	const ids = useMemo(
		() => items.map((item, index) => effectiveGetKey(item, index)),
		[items, effectiveGetKey],
	)

	const { liftedId, setLiftedId, onItemKeyDown, onItemBlur } = useListKeyboard({
		items,
		getKey: effectiveGetKey,
		orientation,
		onReorder,
		enabled: interactive,
		containerRef,
	})

	// Each item reads its own lift from the store, so a lift renders only the item
	// that lifts and the item that drops.
	const liftedStore = useKeyedStore(liftedId, keyMatcher)

	// The drag reports keys. The list maps them back to its items.
	const onReorderIds = useMemo(() => {
		if (onReorder === undefined) return undefined

		return (order: string[]) => {
			const byKey = new Map(ids.map((id, index) => [id, items[index] as T]))

			onReorder(order.filter((id) => byKey.has(id)).map((id) => byKey.get(id) as T))
		}
	}, [ids, items, onReorder])

	const { order, setDraft, onDragStart, onDragEnd } = useReorderDrag({
		ids,
		onReorder: onReorderIds,
		name: useCallback((id: string) => listItemName(containerRef.current, id), []),
		// A pointer drag drops a keyboard lift.
		onStart: useCallback(() => setLiftedId(null), [setLiftedId]),
	})

	const describedBy = useId()

	const railRef = useScrollRegion({ label: ariaLabel })

	// `Reorder` loads in a chunk of its own, so a read-only list does not load it.
	const reorderParts = useListReorder(interactive)

	// Motion reads the reduced-motion preference only when an element mounts, and
	// a list can render outside a `ReducedMotion` root. So the rows read the
	// live preference themselves (WCAG 2.3.3).
	const instant = usePrefersReducedMotion()

	const contextValue = useMemo(
		() => ({
			variant,
			interactive,
			// A read-only list has no reorder to disable, so its handles stay hidden.
			disabled: reorderDisabled,
			liftedStore,
			itemCount: items.length,
			sortable,
			onItemKeyDown,
			onItemBlur,
			reorderParts,
		}),
		[
			variant,
			interactive,
			reorderDisabled,
			liftedStore,
			items.length,
			sortable,
			onItemKeyDown,
			onItemBlur,
			reorderParts,
		],
	)

	// A windowed list renders the rows in view. Only a read-only vertical list
	// windows, because a drag needs every row that it can pass over.
	const getItemKey = useCallback(
		(index: number) => {
			const item = items[index]

			return item === undefined ? index : effectiveGetKey(item, index)
		},
		[items, effectiveGetKey],
	)

	const listWindow = useListWindow({
		enabled: virtual && !interactive && orientation === 'vertical',
		count: items.length,
		getItemKey,
		listRef: containerRef,
	})

	// Memoized so a render that changes neither the order nor the rows does not
	// recreate every item element. Only the rows are held: the consumer rest spread is a fresh object every render, so
	// keeping the `<ul>` itself in here would make the memo miss every time.
	const rows = useMemo(() => {
		if (listWindow.indexes !== null) {
			// The window counts the same items, so each index names one of them.
			return listWindow.indexes.flatMap((index) => {
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
		}

		if (!interactive) {
			return items.map((item, index) => {
				const id = effectiveGetKey(item, index)

				return (
					<ListItemStatic key={id} id={id}>
						{children(item, index)}
					</ListItemStatic>
				)
			})
		}

		const byKey = new Map(ids.map((id, index) => [id, items[index] as T]))

		return order.flatMap((id, index) => {
			const item = byKey.get(id)

			if (item === undefined) return []

			return (
				<ListItemReorder
					key={id}
					id={id}
					describedBy={describedBy}
					instant={instant}
					onDragStart={onDragStart}
					onDragEnd={onDragEnd}
				>
					{children(item, index)}
				</ListItemReorder>
			)
		})
	}, [
		items,
		ids,
		order,
		effectiveGetKey,
		interactive,
		children,
		describedBy,
		instant,
		onDragStart,
		onDragEnd,
		listWindow.indexes,
		listWindow.measureRef,
	])

	const style =
		listWindow.indexes === null
			? props.style
			: {
					...props.style,
					paddingTop: listWindow.paddingTop,
					paddingBottom: listWindow.paddingBottom,
				}

	const ulProps = {
		...props,
		ref: containerRef,
		'aria-label': ariaLabel,
		'data-slot': 'list',
		'data-orientation': orientation,
		'data-disabled': dataAttr(reorderDisabled),
		className: cn(k({ variant, orientation }).base, className),
		style,
	}

	const list = interactive ? (
		<>
			{reorderParts ? (
				<reorderParts.Group
					{...ulProps}
					axis={orientation === 'vertical' ? 'y' : 'x'}
					values={order}
					onReorder={setDraft}
				>
					{rows}
				</reorderParts.Group>
			) : (
				<ul {...ulProps}>{rows}</ul>
			)}
			<div hidden id={describedBy}>
				<IntlMessage message={reorderMessages.liftInstructions} />
			</div>
		</>
	) : (
		<ul {...ulProps}>{rows}</ul>
	)

	return (
		<ListContext value={contextValue}>
			{orientation === 'horizontal' ? (
				<div ref={railRef} data-slot="list-rail" className={k().rail}>
					{list}
				</div>
			) : (
				list
			)}
		</ListContext>
	)
}
