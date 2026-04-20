import type { JsonValueType } from '../../recipes/katachi/json-tree'

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
