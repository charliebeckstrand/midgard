'use client'

import { type KeyboardEventHandler, type RefObject, useEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useVirtualWindow } from '../../hooks'
import { k } from '../../recipes/kata/json-tree'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './json-tree-constants'
import { JsonTreeNodeRow } from './json-tree-node-row'
import {
	type buildSearchIndex,
	collectMatchPaths,
	collectPaths,
	flattenTree,
} from './json-tree-utilities'
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
	const { expanded, toggle, expand } = useJsonTreeExpansion({
		initial: () => collectPaths(data, rootKey, defaultExpandDepth),
		expanded: expandedProp,
		onExpandedChange,
	})

	// The recursive variant auto-expands branches containing a match during
	// render; the flat walk only follows `expanded`, which left matches hidden
	// in virtualized mode. Seed matching branch paths once per search term —
	// seeding (rather than force-opening at flatten time) keeps a matched
	// branch collapsible afterwards.
	const seededSearchRef = useRef<string | null>(null)

	useEffect(() => {
		if (!searchValue || seededSearchRef.current === searchValue) return

		seededSearchRef.current = searchValue

		expand(collectMatchPaths(data, rootKey, searchIndex))
	}, [searchValue, data, rootKey, searchIndex, expand])

	const flatNodes = useMemo(
		() => flattenTree(data, rootKey, expanded, searchValue, filter, searchIndex),
		[data, rootKey, expanded, searchValue, filter, searchIndex],
	)

	const estimateSize = virtualize.estimateSize ?? DEFAULT_ROW_HEIGHT
	const overscan = virtualize.overscan ?? DEFAULT_OVERSCAN

	const { virtualItems, topSpacer, bottomSpacer } = useVirtualWindow({
		count: flatNodes.length,
		getScrollElement: () => ref.current,
		estimateSize,
		overscan,
	})

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
			{(() => {
				// The Tab stop rides the first *focusable rendered* row: with
				// windowing, the depth-0 root can be scrolled out of the DOM, and a
				// depth-anchored stop would leave the tree unreachable by Tab.
				const firstFocusable = virtualItems.find(
					(vi) => flatNodes[vi.index] && flatNodes[vi.index]?.type !== 'branch-close',
				)?.index

				return virtualItems.map((virtualItem) => {
					const node = flatNodes[virtualItem.index]

					if (!node) return null

					return (
						<JsonTreeNodeRow
							key={`${node.type}:${node.path}`}
							node={node}
							onToggle={toggle}
							tabbable={virtualItem.index === firstFocusable}
						/>
					)
				})
			})()}
			{bottomSpacer > 0 && (
				<div role="presentation" data-slot="json-tree-spacer" style={{ height: bottomSpacer }} />
			)}
		</div>
	)
}
