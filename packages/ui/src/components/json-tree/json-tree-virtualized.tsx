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
import { treeMoveForKey } from '../tree/tree-keyboard'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './json-tree-constants'
import { flatTreeMoveTarget } from './json-tree-keyboard'
import { JsonTreeNodeRow } from './json-tree-node-row'
import {
	type FlatNode,
	flattenTree,
	isCollapsibleDepth,
	type JsonTreeCollapsible,
	type SearchIndex,
} from './json-tree-utilities'
import type { JsonValue } from './types'
import { useJsonTreeExpansion } from './use-json-tree-expansion'

const TREE_ITEM_SELECTOR = '[role="treeitem"]'

/** The stable key of a flat row. A branch has an open row and a close row on one path. */
function rowKey(node: FlatNode): string {
	return `${node.type}:${node.path}`
}

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
 * The flat index that a horizontal arrow reaches in the tree model: the first child of
 * an open branch, or the parent of a closed branch or a leaf.
 *
 * @returns Null when focus is not on a row, when the key makes no tree move, or when
 * the move has no target. A branch row that opens or closes itself cancels the event
 * first, so it does not reach this function.
 */
function treeMoveIndex(
	container: HTMLElement,
	event: KeyboardEvent<HTMLDivElement>,
	nodes: readonly FlatNode[],
): number | null {
	const item = event.target

	if (!(item instanceof HTMLElement) || !item.matches(TREE_ITEM_SELECTOR)) return null

	const row = item.closest<HTMLElement>('[data-index]')

	if (!row || !container.contains(row)) return null

	const move = treeMoveForKey(event, item.getAttribute('aria-expanded') === 'true')

	return move === null ? null : flatTreeMoveTarget(nodes, Number(row.dataset.index), move)
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
	collapsible: JsonTreeCollapsible
	expandedProp: Set<string> | undefined
	onExpandedChange: ((expanded: Set<string>) => void) | undefined
	searchValue: string
	filter: boolean
	searchIndex: SearchIndex
	/** Every branch whose subtree holds a search match, or `undefined` with no term. */
	matchPaths: ReadonlySet<string> | undefined
	virtualize: { estimateSize?: number; overscan?: number }
	maxHeight: string
	onKeyDown: KeyboardEventHandler<HTMLDivElement>
	'aria-label': string | undefined
	'aria-labelledby': string | undefined
	className?: string
}

export function JsonTreeVirtualized({
	ref,
	data,
	rootKey,
	defaultExpandDepth,
	collapsible,
	expandedProp,
	onExpandedChange,
	searchValue,
	filter,
	searchIndex,
	matchPaths,
	virtualize,
	maxHeight,
	onKeyDown,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	className,
}: JsonTreeVirtualizedProps) {
	// Uncontrolled, the open state resolves per render, as the recursive
	// variant does. A match opens its branch, and a user toggle wins over both.
	const { isOpen, toggle } = useJsonTreeExpansion({
		expanded: expandedProp,
		onExpandedChange,
		defaultExpandDepth,
		autoOpen: matchPaths,
	})

	// A branch that does not collapse stays open.
	const isOpenOrFixed = useCallback(
		(path: string, depth: number) => !isCollapsibleDepth(collapsible, depth) || isOpen(path, depth),
		[collapsible, isOpen],
	)

	const flatNodes = useMemo(
		() =>
			flattenTree({
				data,
				rootKey,
				isOpen: isOpenOrFixed,
				search: searchValue,
				filter,
				searchIndex,
			}),
		[data, rootKey, isOpenOrFixed, searchValue, filter, searchIndex],
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

	// A long value wraps, so each row measures its real height. The key holds a
	// measured height to its node when rows above it open or close.
	const getItemKey = useCallback(
		(index: number) => rowKey(flatNodes[index] as FlatNode),
		[flatNodes],
	)

	const { virtualItems, topSpacer, bottomSpacer, scrollToIndex, measureRef } = useVirtualWindow({
		count: flatNodes.length,
		getScrollElement: () => ref.current,
		estimateSize,
		overscan,
		getItemKey,
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
	// The tree moves of the horizontal arrows also take their target from the flat index.
	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			// Each key press supersedes a focus that still waits for its row.
			pendingFocusRef.current?.disconnect()

			pendingFocusRef.current = null

			const container = ref.current

			// A branch row that opened or closed itself has handled the key.
			if (event.defaultPrevented) return

			const target = container
				? (treeMoveIndex(container, event, flatNodes) ??
					offWindowTarget(container, event.key, focusable))
				: null

			if (container === null || target === null) {
				onKeyDown(event)

				return
			}

			event.preventDefault()

			// A tree move can land on a mounted row, which takes focus at once.
			const mounted = rowAt(container, target)

			if (mounted) {
				mounted.focus()

				return
			}

			scrollToIndex(target)

			pendingFocusRef.current = focusRowOnMount(container, target)
		},
		[ref, flatNodes, focusable, scrollToIndex, onKeyDown],
	)

	return (
		<div
			ref={ref}
			role="tree"
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledby}
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
						key={virtualItem.key}
						ref={measureRef}
						node={node}
						index={virtualItem.index}
						collapsible={collapsible}
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
