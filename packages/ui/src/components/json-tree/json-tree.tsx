'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { k } from '../../recipes/kata/json-tree'
import { JsonTreeContext } from './context'
import { JsonTreeNode } from './json-tree-node'
import { buildSearchIndex, normalizeSearch, type Search } from './json-tree-utilities'
import { JsonTreeVirtualized } from './json-tree-virtualized'
import type { JsonValue } from './types'

/** Row-virtualization options for {@link JsonTree}: the required scroll-container `maxHeight`, plus optional windowing tuning. */
type JsonTreeVirtualize = { maxHeight: string; estimateSize?: number; overscan?: number }

/** Props for {@link JsonTree}: the `data` value, expansion controls, `search`, and optional `virtualize` windowing. */
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
	 * Enables row virtualization with `{ maxHeight }` (the scroll-container
	 * height) plus optional `estimateSize` / `overscan`. Flattens the visible
	 * tree into a linear list and renders only the viewport slice plus overscan.
	 * Expand/collapse is instant (no animation); leave this off when the
	 * animation matters.
	 */
	virtualize?: JsonTreeVirtualize
	className?: string
}

/**
 * Collapsible `role="tree"` view for an arbitrary {@link JsonValue}. Expands to
 * `defaultExpandDepth` by default, or runs controlled via `expanded` /
 * `onExpandedChange`; `search` highlights and auto-expands matching nodes (and
 * hides non-matches in filter mode). Roving-focus keyboard navigation moves
 * between tree items. Under `virtualize`, flattens the visible tree to a linear
 * list and renders only the viewport slice plus overscan.
 *
 * @remarks
 * Client component. `virtualize` carries its own `maxHeight` and
 * disables expand/collapse animation.
 */
export function JsonTree({
	data,
	rootKey,
	defaultExpandDepth = 1,
	expanded,
	onExpandedChange,
	search,
	virtualize,
	className,
}: JsonTreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const { value: searchValue, filter } = normalizeSearch(search)

	const searchIndex = useMemo(() => buildSearchIndex(data, searchValue), [data, searchValue])

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
	})

	if (virtualize != null) {
		return (
			<JsonTreeVirtualized
				ref={ref}
				data={data}
				rootKey={rootKey}
				defaultExpandDepth={defaultExpandDepth}
				expandedProp={expanded}
				onExpandedChange={onExpandedChange}
				searchValue={searchValue}
				filter={filter}
				searchIndex={searchIndex}
				virtualize={virtualize}
				maxHeight={virtualize.maxHeight}
				onKeyDown={handleKeyDown}
				className={className}
			/>
		)
	}

	return (
		<JsonTreeContext
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
				<JsonTreeNode keyName={rootKey} value={data} />
			</div>
		</JsonTreeContext>
	)
}
