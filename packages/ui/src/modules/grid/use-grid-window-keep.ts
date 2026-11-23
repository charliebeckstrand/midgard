'use client'

import { type FocusEvent, useState, useSyncExternalStore } from 'react'
import { useGridNavContext } from './context'

/** The key by which a windowed body names one of its items. @internal */
type GridWindowKey = string | number

/** How {@link useGridWindowKeep} reads the items of one windowed body. @internal */
export type GridWindowKeepItems = {
	/** The attribute of a row of the body that holds the index of its item. */
	indexAttribute: 'data-index' | 'data-row-index'
	/** The key of the item at an index, or `undefined` for an index outside the list. */
	toKey: (index: number) => GridWindowKey | undefined
	/** The index of the item with a key, or -1 for a key that is not in the list. */
	findIndex: (key: GridWindowKey) => number
}

/**
 * The row of the body that holds `target`: the ancestor `<tr>` whose parent is
 * the body. A row of a table in a detail panel is not a row of the body.
 * @internal
 */
function bodyRow(target: EventTarget, body: Element): Element | null {
	let node = target instanceof Element ? target : null

	while (node && node.parentElement !== body) node = node.parentElement

	return node
}

/**
 * The items that a windowed body keeps mounted out of view: the row of the
 * cursor and the row that holds focus (APG grid, WCAG 2.4.3 and 4.1.2).
 *
 * A scroll by the wheel or the scrollbar moves the window and does not move
 * the cursor. Without this, the window unmounts the row of the cursor, and
 * `aria-activedescendant` names a cell that is not in the document. It also
 * unmounts a row that holds focus, such as a row with an open editor, and
 * focus goes to the page.
 *
 * The cursor names its row by the key that the body scrolls by (see
 * `GridNavStore.activeKey`). The body records the key of the row that holds
 * focus from its focus events. Focus that leaves the body clears that key.
 * A blur of the window keeps it, because focus comes back to the same element.
 *
 * @returns The indices to pass to `useVirtualWindow` as `keep`, and the focus
 * handlers of the `<tbody>`.
 * @internal
 */
export function useGridWindowKeep({ indexAttribute, toKey, findIndex }: GridWindowKeepItems) {
	const nav = useGridNavContext()

	const cursorKey = useSyncExternalStore(nav.subscribe, nav.activeKey, nav.activeKey)

	const [focusKey, setFocusKey] = useState<GridWindowKey | null>(null)

	const onFocus = (event: FocusEvent<HTMLTableSectionElement>) => {
		const row = bodyRow(event.target, event.currentTarget)

		const index = row?.getAttribute(indexAttribute)

		setFocusKey((index == null ? undefined : toKey(Number(index))) ?? null)
	}

	const onBlur = (event: FocusEvent<HTMLTableSectionElement>) => {
		const next = event.relatedTarget

		if (next instanceof Node && event.currentTarget.contains(next)) return

		if (next === null && !document.hasFocus()) return

		setFocusKey(null)
	}

	const keep: number[] = []

	for (const key of [cursorKey, focusKey]) {
		const index = key === null ? -1 : findIndex(key)

		if (index >= 0) keep.push(index)
	}

	return { keep, onFocus, onBlur }
}
