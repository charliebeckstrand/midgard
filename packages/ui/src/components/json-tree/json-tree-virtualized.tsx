'use client'

import {
	type KeyboardEvent,
	type KeyboardEventHandler,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { cn } from '../../core'
import { useVirtualWindow } from '../../hooks'
import { k } from '../../recipes/kata/json-tree'
import { nextIndexForKey } from '../../utilities'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './json-tree-constants'
import { JsonTreeNodeRow } from './json-tree-node-row'
import { type buildSearchIndex, collectMatchPaths, flattenTree } from './json-tree-utilities'
import type { JsonValue } from './types'
import { useJsonTreeExpansion } from './use-json-tree-expansion'

const TREE_ITEM_SELECTOR = '[role="treeitem"]'

/** The mounted treeitem of the row at flat `index`, or null when windowing keeps the row out of the DOM. */
function rowAt(container: HTMLElement, index: number): HTMLElement | null {
	return container.querySelector<HTMLElement>(`[data-index="${index}"] ${TREE_ITEM_SELECTOR}`)
}

/**
 * The flat index that a navigation key reaches when that row is outside the window.
 *
 * @returns Null when focus is not on a row, when the key does not navigate, or when the target
 * row is mounted. In the last case, the roving handler moves focus over the DOM.
 */
function offWindowTarget(
	container: HTMLElement,
	key: string,
	focusable: readonly number[],
): number | null {
	const active = document.activeElement

	if (!(active instanceof HTMLElement) || !container.contains(active)) return null

	if (!active.matches(TREE_ITEM_SELECTOR)) return null

	const row = active.closest<HTMLElement>('[data-index]')

	const position = row ? focusable.indexOf(Number(row.dataset.index)) : -1

	if (position === -1) return null

	const next = nextIndexForKey(key, position, focusable.length, { orientation: 'vertical' })

	const target = next === null ? undefined : focusable[next]

	if (target === undefined || rowAt(container, target)) return null

	return target
}

/**
 * Focuses the row at flat `index` when it mounts. The virtualizer mounts a row on its own
 * schedule after `scrollToIndex`, so a `MutationObserver` waits for it.
 *
 * @returns The observer that still waits, or null when the row was already mounted.
 */
function focusRowOnMount(container: HTMLElement, index: number): MutationObserver | null {
	const focusRow = () => {
		const row = rowAt(container, index)

		// Focus that went outside the tree in the meantime stays there.
		const active = document.activeElement

		const idle = !active || active === document.body || container.contains(active)

		if (row && idle) row.focus()

		return row !== null
	}

	if (focusRow()) return null

	const observer = new MutationObserver(() => {
		if (focusRow()) observer.disconnect()
	})

	observer.observe(container, { childList: true, subtree: true })

	return observer
}

type JsonTreeVirtualizedProps = {
	ref: RefObject<HTMLDivElement | null>
	data: JsonValue
	rootKey: string | undefined
	defaultExpandDepth: number
	expandedProp: Set<string> | undefined
	onExpandedChange: ((expanded: Set<string>) => void) | undefined
	searchValue: string
	filter: boolean
	searchIndex: ReturnType<typeof buildSearchIndex>
	virtualize: { estimateSize?: number; overscan?: number }
	maxHeight: string
	onKeyDown: KeyboardEventHandler<HTMLDivElement>
	className?: string
}

export function JsonTreeVirtualized({
	ref,
	data,
	rootKey,
	defaultExpandDepth,
	expandedProp,
	onExpandedChange,
	searchValue,
	filter,
	searchIndex,
	virtualize,
	maxHeight,
	onKeyDown,
	className,
}: JsonTreeVirtualizedProps) {
	const controlled = expandedProp !== undefined

	// Every branch whose subtree holds a search match. Also keyed on `data`, so
	// the set follows a new payload.
	const matchPaths = useMemo(
		() => (searchValue ? collectMatchPaths(data, rootKey, searchIndex) : undefined),
		[searchValue, data, rootKey, searchIndex],
	)

	// Uncontrolled, the open state resolves per render, as the recursive
	// variant does. A match opens its branch, and a user toggle wins over both.
	const { isOpen, toggle, expand } = useJsonTreeExpansion({
		expanded: expandedProp,
		onExpandedChange,
		defaultExpandDepth,
		autoOpen: matchPaths,
	})

	// Controlled, the flat walk follows only `expanded`. Seeds the match paths
	// once per search term; a seeded branch stays collapsible afterwards.
	const seededSearchRef = useRef<string | null>(null)

	useEffect(() => {
		if (!controlled || !matchPaths || seededSearchRef.current === searchValue) return

		seededSearchRef.current = searchValue

		expand(matchPaths)
	}, [controlled, matchPaths, searchValue, expand])

	const flatNodes = useMemo(
		() => flattenTree({ data, rootKey, isOpen, search: searchValue, filter, searchIndex }),
		[data, rootKey, isOpen, searchValue, filter, searchIndex],
	)

	// A row reports only its path. The flat walk already resolved its open state.
	const handleToggle = useCallback(
		(path: string) => {
			const row = flatNodes.find((node) => node.type === 'branch-open' && node.path === path)

			if (row?.type === 'branch-open') toggle(path, row.open)
		},
		[flatNodes, toggle],
	)

	const estimateSize = virtualize.estimateSize ?? DEFAULT_ROW_HEIGHT
	const overscan = virtualize.overscan ?? DEFAULT_OVERSCAN

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex } = useVirtualWindow({
		count: flatNodes.length,
		getScrollElement: () => ref.current,
		estimateSize,
		overscan,
	})

	// The Tab stop rides the first focusable rendered row; windowing can
	// scroll the depth-0 root out of the DOM.
	const firstFocusable = useMemo(
		() =>
			virtualItems.find((vi) => flatNodes[vi.index] && flatNodes[vi.index]?.type !== 'branch-close')
				?.index,
		[virtualItems, flatNodes],
	)

	// The flat indices of the rows that take focus. A closing bracket is not a treeitem.
	const focusable = useMemo(
		() => flatNodes.flatMap((node, index) => (node.type === 'branch-close' ? [] : [index])),
		[flatNodes],
	)

	// One pending focus per tree. A newer navigation, or the unmount, cancels it.
	const pendingFocusRef = useRef<MutationObserver | null>(null)

	useEffect(() => () => pendingFocusRef.current?.disconnect(), [])

	// The roving handler sees only the mounted rows. Home, End and the arrows that leave the
	// window take their target from the flat index, scroll it in, and focus it when it mounts.
	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			// Each key press supersedes a focus that still waits for its row.
			pendingFocusRef.current?.disconnect()

			pendingFocusRef.current = null

			const container = ref.current

			const target = container ? offWindowTarget(container, event.key, focusable) : null

			if (container === null || target === null) {
				onKeyDown(event)

				return
			}

			event.preventDefault()

			scrollToIndex(target)

			pendingFocusRef.current = focusRowOnMount(container, target)
		},
		[ref, focusable, scrollToIndex, onKeyDown],
	)

	return (
		<div
			ref={ref}
			role="tree"
			data-slot="json-tree"
			className={cn(k.base, className)}
			style={{ maxHeight, overflow: 'auto' }}
			onKeyDown={handleKeyDown}
		>
			{topSpacer > 0 && (
				<div
					role="presentation"
					data-slot="json-tree-spacer"
					className={k.spacer}
					style={{ height: topSpacer }}
				/>
			)}
			{virtualItems.map((virtualItem) => {
				const node = flatNodes[virtualItem.index]

				if (!node) return null

				return (
					<JsonTreeNodeRow
						key={`${node.type}:${node.path}`}
						node={node}
						index={virtualItem.index}
						onToggle={handleToggle}
						tabbable={virtualItem.index === firstFocusable}
					/>
				)
			})}
			{bottomSpacer > 0 && (
				<div
					role="presentation"
					data-slot="json-tree-spacer"
					className={k.spacer}
					style={{ height: bottomSpacer }}
				/>
			)}
		</div>
	)
}
