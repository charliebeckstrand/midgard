'use client'

import {
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
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './json-tree-constants'
import { JsonTreeNodeRow } from './json-tree-node-row'
import { type buildSearchIndex, collectMatchPaths, flattenTree } from './json-tree-utilities'
import type { JsonValue } from './types'
import { useJsonTreeExpansion } from './use-json-tree-expansion'

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

	const { virtualItems, topSpacer, bottomSpacer } = useVirtualWindow({
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

	return (
		<div
			ref={ref}
			role="tree"
			data-slot="json-tree"
			className={cn(k.base, className)}
			style={{ maxHeight, overflow: 'auto' }}
			onKeyDown={onKeyDown}
		>
			{topSpacer > 0 && (
				<div role="presentation" data-slot="json-tree-spacer" style={{ height: topSpacer }} />
			)}
			{virtualItems.map((virtualItem) => {
				const node = flatNodes[virtualItem.index]

				if (!node) return null

				return (
					<JsonTreeNodeRow
						key={`${node.type}:${node.path}`}
						node={node}
						onToggle={handleToggle}
						tabbable={virtualItem.index === firstFocusable}
					/>
				)
			})}
			{bottomSpacer > 0 && (
				<div role="presentation" data-slot="json-tree-spacer" style={{ height: bottomSpacer }} />
			)}
		</div>
	)
}
