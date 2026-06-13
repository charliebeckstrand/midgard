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

type JsonTreeVirtualize = boolean | { estimateSize?: number; overscan?: number }

/** Props for {@link JsonTree}: the `data` value, expansion controls, `search`, and optional `virtualize`/`maxHeight` windowing. */
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
	 * Expand/collapse is instant (no animation); leave this off when the
	 * animation matters.
	 */
	virtualize?: JsonTreeVirtualize
	/** Scroll-container height when `virtualize` is on. */
	maxHeight?: string
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
 * Client component. `virtualize` requires `maxHeight` (omitting it throws) and
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
	maxHeight,
	className,
}: JsonTreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const { value: searchValue, filter } = normalizeSearch(search)

	const searchIndex = useMemo(() => buildSearchIndex(data, searchValue), [data, searchValue])

	const handleKeyDown = useA11yRoving(ref, {
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
				virtualize={typeof virtualize === 'object' ? virtualize : {}}
				maxHeight={maxHeight ?? ''}
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
