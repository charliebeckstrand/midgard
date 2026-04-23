import type { JsonValueType } from '../../recipes/kata/json-tree'

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

export type Search = string | { value: string; filter?: boolean }

export function normalizeSearch(search: Search | undefined): { value: string; filter: boolean } {
	if (search == null) return { value: '', filter: false }

	if (typeof search === 'string') return { value: search, filter: false }

	return { value: search.value, filter: search.filter ?? false }
}

export const INDENT_REM = 1.25

export function isBranch(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
	return typeof value === 'object' && value !== null
}

export function getEntries(value: JsonValue): [string | number, JsonValue][] {
	if (Array.isArray(value)) return value.map((v, i) => [i, v])

	if (typeof value === 'object' && value !== null) return Object.entries(value)

	return []
}

export function matchesSearch(key: string | number | undefined, value: JsonValue, term: string) {
	if (!term) return false

	const lower = term.toLowerCase()

	if (key != null && String(key).toLowerCase().includes(lower)) return true

	if (!isBranch(value) && String(value).toLowerCase().includes(lower)) return true

	return false
}

export function treeContainsMatch(value: JsonValue, term: string): boolean {
	if (!term) return false

	for (const [childKey, childValue] of getEntries(value)) {
		if (matchesSearch(childKey, childValue, term)) return true

		if (isBranch(childValue) && treeContainsMatch(childValue, term)) return true
	}

	return false
}

export type SearchIndex = WeakMap<object, boolean>

/** Walk the tree once and record which branch nodes contain a match. */
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

// ── Tree flattening (for virtualized rendering) ───────

export type FlatNode =
	| {
			kind: 'leaf'
			path: string
			keyName: string | number | undefined
			value: JsonValue
			depth: number
			highlighted: boolean
	  }
	| {
			kind: 'branch-open'
			path: string
			keyName: string | number | undefined
			value: JsonValue[] | { [key: string]: JsonValue }
			depth: number
			open: boolean
			count: number
			highlighted: boolean
	  }
	| {
			kind: 'branch-close'
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

			out.push({ kind: 'leaf', path, keyName, value, depth, highlighted })

			return
		}

		const entries =
			filter && search ? filterEntries(getEntries(value), search, searchIndex) : getEntries(value)

		const open = expanded.has(path)

		const count = entries.length

		out.push({
			kind: 'branch-open',
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

		out.push({ kind: 'branch-close', path, depth, value })
	}

	walk(data, rootKey, String(rootKey ?? '$'), 0)

	return out
}
