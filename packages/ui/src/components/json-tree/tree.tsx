'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { JsonTreeProvider } from './context'
import { JsonNode } from './node'
import { JsonNodeRow } from './node-row'
import {
	buildSearchIndex,
	collectPaths,
	flattenTree,
	type JsonValue,
	normalizeSearch,
	type Search,
} from './utilities'
import { k } from './variants'

export type { JsonValue }

export type JsonTreeVirtualize = boolean | { estimateSize?: number; overscan?: number }

const DEFAULT_ROW_HEIGHT = 24
const DEFAULT_OVERSCAN = 20

export type JsonTreeProps = {
	/** The JSON value to render. */
	data: JsonValue
	/** Root label (renders as the root key). */
	rootKey?: string
	/** Nested levels open by default. Pass `Infinity` to expand everything. */
	defaultExpandDepth?: number
	/** Controlled set of expanded node paths. When provided, the tree becomes controlled and `onExpandedChange` fires on toggle. */
	expanded?: Set<string>
	/** Called when the expanded set changes (controlled mode). */
	onExpandedChange?: (expanded: Set<string>) => void
	/** Search term to highlight and auto-expand matching nodes. Pass a string or `{ value, filter }` to also hide non-matching nodes. */
	search?: Search
	/**
	 * Enables row virtualization. Flattens the visible tree into a linear list
	 * and renders only the viewport slice plus overscan. Requires `maxHeight`.
	 *
	 * Trade-off: instant expand/collapse (no animation). For most cases that's
	 * fine; if animations matter for your tree, leave this off.
	 */
	virtualize?: JsonTreeVirtualize
	/** Scroll-container height when `virtualize` is on. */
	maxHeight?: string
	className?: string
}

export function JsonTree({
	data,
	rootKey,
	defaultExpandDepth = 1,
	expanded,
	onExpandedChange,
	search,
	virtualize,
	maxHeight,
	className,
}: JsonTreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const { value: searchValue, filter } = normalizeSearch(search)

	const searchIndex = useMemo(() => buildSearchIndex(data, searchValue), [data, searchValue])

	const handleKeyDown = useRoving(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
	})

	if (virtualize && !maxHeight) {
		throw new Error(
			'<JsonTree virtualize> requires `maxHeight` — virtualization needs a scroll container of known size.',
		)
	}

	const virtualizeEnabled = virtualize != null && virtualize !== false

	if (virtualizeEnabled) {
		return (
			<VirtualizedJsonTree
				ref={ref}
				data={data}
				rootKey={rootKey}
				defaultExpandDepth={defaultExpandDepth}
				expandedProp={expanded}
				onExpandedChange={onExpandedChange}
				searchValue={searchValue}
				filter={filter}
				searchIndex={searchIndex}
				virtualize={typeof virtualize === 'object' ? virtualize : {}}
				maxHeight={maxHeight ?? ''}
				onKeyDown={handleKeyDown}
				className={className}
			/>
		)
	}

	return (
		<JsonTreeProvider
			value={{
				depth: 0,
				defaultExpandDepth,
				search: searchValue,
				filter,
				searchIndex,
				path: '',
				expanded,
				onExpandedChange,
			}}
		>
			<div
				ref={ref}
				role="tree"
				data-slot="json-tree"
				className={cn(k.base, className)}
				onKeyDown={handleKeyDown}
			>
				<JsonNode keyName={rootKey} value={data} />
			</div>
		</JsonTreeProvider>
	)
}

// ── Virtualized path ───────────────────────────────────

type VirtualizedJsonTreeProps = {
	ref: React.RefObject<HTMLDivElement | null>
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
	onKeyDown: React.KeyboardEventHandler<HTMLDivElement>
	className?: string
}

function VirtualizedJsonTree({
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
}: VirtualizedJsonTreeProps) {
	const controlled = expandedProp !== undefined

	// Internal store mirrors per-node `useState` from the recursive path.
	// Seeded once from defaultExpandDepth; later edits are the user's own.
	const [internalExpanded, setInternalExpanded] = useState<Set<string>>(() =>
		collectPaths(data, rootKey, defaultExpandDepth),
	)

	const expanded = controlled ? (expandedProp as Set<string>) : internalExpanded

	const toggle = useCallback(
		(path: string) => {
			if (controlled && onExpandedChange) {
				const next = new Set(expandedProp)

				if (next.has(path)) next.delete(path)
				else next.add(path)

				onExpandedChange(next)

				return
			}

			setInternalExpanded((prev) => {
				const next = new Set(prev)

				if (next.has(path)) next.delete(path)
				else next.add(path)

				return next
			})
		},
		[controlled, expandedProp, onExpandedChange],
	)

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

				return <JsonNodeRow key={`${node.kind}:${node.path}`} node={node} onToggle={toggle} />
			})}
			{bottomSpacer > 0 && <div data-slot="json-tree-spacer" style={{ height: bottomSpacer }} />}
		</div>
	)
}
