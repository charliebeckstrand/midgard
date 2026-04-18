'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { JsonTreeProvider } from './context'
import { JsonNode } from './node'
import { buildSearchIndex, type JsonValue, normalizeSearch, type Search } from './utilities'
import { k } from './variants'

export type { JsonValue }

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
	className?: string
}

export function JsonTree({
	data,
	rootKey,
	defaultExpandDepth = 1,
	expanded,
	onExpandedChange,
	search,
	className,
}: JsonTreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const { value: searchValue, filter } = normalizeSearch(search)

	const searchIndex = useMemo(() => buildSearchIndex(data, searchValue), [data, searchValue])

	const handleKeyDown = useRoving(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
	})

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
