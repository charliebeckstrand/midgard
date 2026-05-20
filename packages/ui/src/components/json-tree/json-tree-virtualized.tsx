'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { type KeyboardEventHandler, type RefObject, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/json-tree'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './json-tree-constants'
import { JsonTreeNodeRow } from './json-tree-node-row'
import { type buildSearchIndex, collectPaths, flattenTree } from './json-tree-utilities'
import type { JsonValue } from './types'
import { useJsonTreeExpansion } from './use-json-tree-expansion'

export type JsonTreeVirtualizedProps = {
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
	const { expanded, toggle } = useJsonTreeExpansion({
		initial: () => collectPaths(data, rootKey, defaultExpandDepth),
		expanded: expandedProp,
		onExpandedChange,
	})

	const flatNodes = useMemo(
		() => flattenTree(data, rootKey, expanded, searchValue, filter, searchIndex),
		[data, rootKey, expanded, searchValue, filter, searchIndex],
	)

	const estimateSize = virtualize.estimateSize ?? DEFAULT_ROW_HEIGHT
	const overscan = virtualize.overscan ?? DEFAULT_OVERSCAN

	const virtualizer = useVirtualizer({
		count: flatNodes.length,
		getScrollElement: () => ref.current,
		estimateSize: () => estimateSize,
		overscan,
	})

	const virtualItems = virtualizer.getVirtualItems()
	const totalSize = virtualizer.getTotalSize()

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems[virtualItems.length - 1]

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	return (
		<div
			ref={ref}
			role="tree"
			data-slot="json-tree"
			className={cn(k.base, className)}
			style={{ maxHeight, overflow: 'auto' }}
			onKeyDown={onKeyDown}
		>
			{topSpacer > 0 && <div data-slot="json-tree-spacer" style={{ height: topSpacer }} />}
			{virtualItems.map((vi) => {
				const node = flatNodes[vi.index]

				if (!node) return null

				return <JsonTreeNodeRow key={`${node.type}:${node.path}`} node={node} onToggle={toggle} />
			})}
			{bottomSpacer > 0 && <div data-slot="json-tree-spacer" style={{ height: bottomSpacer }} />}
		</div>
	)
}
