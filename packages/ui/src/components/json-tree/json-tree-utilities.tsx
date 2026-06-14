import { cn } from '../../core'
import { type JsonValueType, k } from '../../recipes/kata/json-tree'
import type { JsonValue } from './types'

/**
 * Search input for {@link JsonTree}: a bare term, or `{ value, filter }` where
 * `filter` also hides non-matching nodes rather than only highlighting them.
 *
 * @see {@link JsonTreeProps.search}
 */
export type Search = string | { value: string; filter?: boolean }

/**
 * Normalizes a {@link Search} into `{ value, filter }`, treating a bare string
 * (or `null`/`undefined`) as highlight-only.
 *
 * @internal
 */
export function normalizeSearch(search: Search | undefined): { value: string; filter: boolean } {
	if (search == null) return { value: '', filter: false }

	if (typeof search === 'string') return { value: search, filter: false }

	return { value: search.value, filter: search.filter ?? false }
}

/** Narrows a {@link JsonValue} to a branch (array or object); `null` is a leaf. @internal */
export function isBranch(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
	return typeof value === 'object' && value !== null
}

/** Branch entries as `[key, value]` pairs (array indices or object keys); leaves yield none. @internal */
export function getEntries(value: JsonValue): [string | number, JsonValue][] {
	if (Array.isArray(value)) return value.map((v, i) => [i, v])

	if (typeof value === 'object' && value !== null) return Object.entries(value)

	return []
}

/** True when a node's key or scalar value contains `term` (case-insensitive); branch values never match directly. @internal */
export function matchesSearch(key: string | number | undefined, value: JsonValue, term: string) {
	if (!term) return false

	const lower = term.toLowerCase()

	if (key != null && String(key).toLowerCase().includes(lower)) return true

	if (!isBranch(value) && String(value).toLowerCase().includes(lower)) return true

	return false
}

/** Recursive fallback for {@link filterEntries} when no {@link SearchIndex} is supplied: true if any descendant matches. @internal */
export function treeContainsMatch(value: JsonValue, term: string): boolean {
	if (!term) return false

	for (const [childKey, childValue] of getEntries(value)) {
		if (matchesSearch(childKey, childValue, term)) return true

		if (isBranch(childValue) && treeContainsMatch(childValue, term)) return true
	}

	return false
}

/** Branch node → whether its subtree contains a search match; built once per term to avoid re-walking. @internal */
export type SearchIndex = WeakMap<object, boolean>

/** Walks the tree once and records which branch nodes contain a match. @internal */
export function buildSearchIndex(data: JsonValue, term: string): SearchIndex {
	const index: SearchIndex = new WeakMap()

	if (!term || !isBranch(data)) return index

	function walk(value: JsonValue): boolean {
		if (!isBranch(value)) return false

		let contains = false

		for (const [childKey, childValue] of getEntries(value)) {
			if (matchesSearch(childKey, childValue, term)) contains = true

			if (isBranch(childValue) && walk(childValue)) contains = true
		}

		index.set(value, contains)

		return contains
	}

	walk(data)

	return index
}

/** Keeps entries that match directly or, for branches, whose subtree contains a match (via `index`, else a recursive walk). @internal */
export function filterEntries(
	entries: [string | number, JsonValue][],
	term: string,
	index?: SearchIndex,
) {
	return entries.filter(
		([key, value]) =>
			matchesSearch(key, value, term) ||
			(isBranch(value) && (index ? index.get(value) === true : treeContainsMatch(value, term))),
	)
}

/**
 * Paths of every branch whose subtree contains a search match; the seed set
 * for `expanded`. Prunes on the index: a branch without a match has no
 * matching descendants.
 */
export function collectMatchPaths(
	data: JsonValue,
	rootKey: string | undefined,
	index: SearchIndex,
): Set<string> {
	const paths = new Set<string>()

	function walk(value: JsonValue, path: string) {
		if (!isBranch(value) || index.get(value) !== true) return

		paths.add(path)

		for (const [childKey, childValue] of getEntries(value)) {
			walk(childValue, `${path}.${childKey}`)
		}
	}

	if (isBranch(data)) walk(data, String(rootKey ?? '$'))

	return paths
}

/** Collect paths for all expandable (branch) nodes, optionally limited to a max depth. */
export function collectPaths(
	data: JsonValue,
	rootKey?: string,
	maxDepth = Number.POSITIVE_INFINITY,
): Set<string> {
	const paths = new Set<string>()

	function walk(value: JsonValue, path: string, depth: number) {
		if (!isBranch(value) || depth >= maxDepth) return

		paths.add(path)

		for (const [childKey, childValue] of getEntries(value)) {
			walk(childValue, `${path}.${childKey}`, depth + 1)
		}
	}

	if (isBranch(data)) {
		const rootPath = String(rootKey ?? '$')

		walk(data, rootPath, 0)
	}

	return paths
}

export function valueType(value: JsonValue): JsonValueType {
	if (value === null) return 'null'

	const t = typeof value

	if (t === 'string') return 'string'

	if (t === 'number') return 'number'

	return 'boolean'
}

export type FlatNode =
	| {
			type: 'leaf'
			path: string
			keyName: string | number | undefined
			value: JsonValue
			depth: number
			highlighted: boolean
	  }
	| {
			type: 'branch-open'
			path: string
			keyName: string | number | undefined
			value: JsonValue[] | { [key: string]: JsonValue }
			depth: number
			open: boolean
			count: number
			highlighted: boolean
	  }
	| {
			type: 'branch-close'
			path: string
			depth: number
			value: JsonValue[] | { [key: string]: JsonValue }
	  }

/**
 * Walk a tree following `expanded` paths and return a flat list of rows in
 * render order. Each open branch emits a `branch-open` row, its (possibly
 * filtered) children, and a `branch-close` row.
 *
 * When `search` is set and `filter` is true, non-matching leaves are omitted
 * and branches that don't contain a match collapse to a single `branch-open`
 * row with `open=false` (caller can render a summary).
 */
export function flattenTree(
	data: JsonValue,
	rootKey: string | undefined,
	expanded: Set<string>,
	search: string,
	filter: boolean,
	searchIndex: SearchIndex,
): FlatNode[] {
	const out: FlatNode[] = []

	function walk(
		value: JsonValue,
		keyName: string | number | undefined,
		path: string,
		depth: number,
	) {
		const highlighted = search ? matchesSearch(keyName, value, search) : false

		if (!isBranch(value)) {
			if (filter && search && !highlighted) return

			out.push({ type: 'leaf', path, keyName, value, depth, highlighted })

			return
		}

		const entries =
			filter && search ? filterEntries(getEntries(value), search, searchIndex) : getEntries(value)

		const open = expanded.has(path)

		const count = entries.length

		out.push({
			type: 'branch-open',
			path,
			keyName,
			value,
			depth,
			open,
			count,
			highlighted,
		})

		if (!open) return

		for (const [childKey, childValue] of entries) {
			const childPath = `${path}.${childKey}`

			walk(childValue, childKey, childPath, depth + 1)
		}

		out.push({ type: 'branch-close', path, depth, value })
	}

	walk(data, rootKey, String(rootKey ?? '$'), 0)

	return out
}

export function NodeKey({ keyName }: { keyName?: string | number }) {
	if (keyName == null) return null

	if (typeof keyName === 'number') {
		return (
			<>
				<span className={cn(k.index)}>{keyName}</span>
				<span className={cn(k.punctuation)}>:</span>
			</>
		)
	}

	return (
		<>
			<span className={cn(k.key)}>{`"${keyName}"`}</span>
			<span className={cn(k.punctuation)}>:</span>
		</>
	)
}

export function PrimitiveValue({ value }: { value: JsonValue }) {
	const type = valueType(value)

	const display = value === null ? 'null' : type === 'string' ? `"${value}"` : String(value)

	return <span className={cn(k.valueColor[type])}>{display}</span>
}
