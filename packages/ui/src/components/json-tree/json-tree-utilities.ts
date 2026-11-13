import type { JsonValueType } from '../../recipes/kata/json-tree'
import type { JsonValue } from './types'

/**
 * Search input for {@link JsonTree}: a bare term, or `{ value, filter }` where
 * `filter` also hides non-matching nodes rather than only highlighting them.
 *
 * @see {@link JsonTreeProps.search}
 */
export type JsonTreeSearch = string | { value: string; filter?: boolean }

/**
 * Normalizes a {@link JsonTreeSearch} into `{ value, filter }`, treating a bare string
 * (or `null`/`undefined`) as highlight-only.
 *
 * @internal
 */
export function normalizeSearch(search: JsonTreeSearch | undefined): {
	value: string
	filter: boolean
} {
	if (search == null) return { value: '', filter: false }

	if (typeof search === 'string') return { value: search, filter: false }

	return { value: search.value, filter: search.filter ?? false }
}

/**
 * Which branches of a {@link JsonTree} the reader can open and close: `true`
 * for each branch, `false` for none, `'root'` for the root branch only, and
 * `'children'` for each branch under the root. A branch that the reader cannot
 * close stays open.
 *
 * @see {@link JsonTreeProps.collapsible}
 */
export type JsonTreeCollapsible = boolean | 'root' | 'children'

/** Whether the branch at `depth` opens and closes. The root has depth 0. @internal */
export function isCollapsibleDepth(collapsible: JsonTreeCollapsible, depth: number): boolean {
	if (typeof collapsible === 'boolean') return collapsible

	return collapsible === 'root' ? depth === 0 : depth > 0
}

/** Narrows a {@link JsonValue} to a branch (array or object); `null` is a leaf. @internal */
export function isBranch(value: JsonValue) {
	return typeof value === 'object' && value !== null
}

/** Branch entries as `[key, value]` pairs (array indices or object keys); leaves yield none. @internal */
export function getEntries(value: JsonValue): [string | number, JsonValue][] {
	if (Array.isArray(value)) return value.map((item, index) => [index, item])

	if (typeof value === 'object' && value !== null) return Object.entries(value)

	return []
}

/**
 * Escape a node-path segment so the `.` join separator is unambiguous. A key
 * that literally contains `.` (or the `\` escape char) can no longer masquerade
 * as a deeper path. A no-op for ordinary keys, so existing path strings are
 * unchanged. Without this, `{ "a.b": 1 }` and `{ a: { b: 1 } }` collide on the
 * same path, cross-wiring their expand state and React keys.
 *
 * @internal
 */
export function encodePathSegment(key: string | number): string {
	return String(key).replace(/[\\.]/g, '\\$&')
}

/** Compose a child node path from its parent path and (escaped) key. @internal */
export function joinPath(parentPath: string, childKey: string | number): string {
	return `${parentPath}.${encodePathSegment(childKey)}`
}

/** True when a node's key or scalar value contains `term` (case-insensitive); branch values never match directly. @internal */
export function matchesSearch(key: string | number | undefined, value: JsonValue, term: string) {
	if (!term) return false

	const lower = term.toLowerCase()

	return (
		(key != null && String(key).toLowerCase().includes(lower)) ||
		(!isBranch(value) && String(value).toLowerCase().includes(lower))
	)
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

/** Keeps the entries that match directly, and the branches whose subtree holds a match in `index`. @internal */
export function filterEntries(
	entries: [string | number, JsonValue][],
	term: string,
	index: SearchIndex,
) {
	return entries.filter(
		([key, value]) =>
			matchesSearch(key, value, term) || (isBranch(value) && index.get(value) === true),
	)
}

/** The search of a {@link JsonTree}: the term, the filter flag, and the index of the term. @internal */
export type JsonTreeSearchState = { term: string; filter: boolean; index: SearchIndex }

/**
 * The search state of one node. The parts that the node shows depend on the
 * search only through these values.
 *
 * @internal
 */
export type JsonTreeNodeSearch = {
	/** The key or the scalar value of the node holds the term. */
	highlighted: boolean
	/** The node is a branch, and its subtree holds a match. */
	hasMatch: boolean
	/** The filter is on with a term, so the filter can hide the entries of the node. */
	filtered: boolean
	/** The filter hides the node. */
	hidden: boolean
	/** The number of entries that the filter keeps. It is 0 when `filtered` is false. */
	kept: number
}

const HIGHLIGHTED = 1

const HAS_MATCH = 2

const FILTERED = 4

const HIDDEN = 8

/** The bits below the count of a packed {@link JsonTreeNodeSearch}. */
const KEPT_SHIFT = 4

/**
 * The {@link JsonTreeNodeSearch} of one node, packed in a number, so two
 * states compare by value.
 *
 * @param state - The search of the tree.
 * @param keyName - The key of the node.
 * @param value - The value of the node.
 * @param root - The node is the root. The filter never hides a root branch,
 * because no parent filters it.
 * @internal
 */
export function packNodeSearch(
	{ term, filter, index }: JsonTreeSearchState,
	keyName: string | number | undefined,
	value: JsonValue,
	root: boolean,
): number {
	const branch = isBranch(value)

	const highlighted = matchesSearch(keyName, value, term)

	const hasMatch = branch && term ? index.get(value as object) === true : false

	const filtered = filter && term !== ''

	const hidden = filtered && !highlighted && !hasMatch && (!branch || !root)

	const kept =
		filtered && branch && !hidden ? filterEntries(getEntries(value), term, index).length : 0

	return (
		(highlighted ? HIGHLIGHTED : 0) |
		(hasMatch ? HAS_MATCH : 0) |
		(filtered ? FILTERED : 0) |
		(hidden ? HIDDEN : 0) |
		(kept << KEPT_SHIFT)
	)
}

/** Unpacks the number that {@link packNodeSearch} gives. @internal */
export function unpackNodeSearch(packed: number): JsonTreeNodeSearch {
	return {
		highlighted: (packed & HIGHLIGHTED) !== 0,
		hasMatch: (packed & HAS_MATCH) !== 0,
		filtered: (packed & FILTERED) !== 0,
		hidden: (packed & HIDDEN) !== 0,
		kept: packed >> KEPT_SHIFT,
	}
}

/**
 * The packed search state of each entry of a branch, as one string. The entry
 * list of a branch reads it through `useSyncExternalStore`, which compares two
 * reads by `Object.is`. So a new term renders the list only when the state of
 * an entry changes. With no term, each state is 0, and the read gives the
 * empty string.
 *
 * @param state - The search of the tree.
 * @param entries - The entries of the branch, from {@link getEntries}.
 * @internal
 */
export function readEntriesSearch(
	state: JsonTreeSearchState,
	entries: [string | number, JsonValue][],
): string {
	if (!state.term) return ''

	return entries.map(([key, value]) => packNodeSearch(state, key, value, false)).join(',')
}

/**
 * Paths of every branch whose subtree contains a search match. Both variants
 * seed a controlled `expanded` set with them. The virtualized tree also opens
 * them by default when uncontrolled. Prunes on the index: a branch without a match has no
 * matching descendants.
 *
 * @internal
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
			walk(childValue, joinPath(path, childKey))
		}
	}

	if (isBranch(data)) walk(data, encodePathSegment(rootKey ?? '$'))

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
			walk(childValue, joinPath(path, childKey), depth + 1)
		}
	}

	if (isBranch(data)) {
		const rootPath = encodePathSegment(rootKey ?? '$')

		walk(data, rootPath, 0)
	}

	return paths
}

/** Classifies a scalar {@link JsonValue} into its {@link JsonValueType} for value coloring; `null` reports `'null'`. @internal */
export function valueType(value: JsonValue): JsonValueType {
	if (value === null) return 'null'

	const type = typeof value

	if (type === 'string') return 'string'

	if (type === 'number') return 'number'

	return 'boolean'
}

/**
 * The place of a flat treeitem among its siblings. Windowing keeps most
 * siblings out of the DOM, so assistive technology cannot count them. The row
 * gives both values as `aria-setsize` and `aria-posinset`.
 *
 * @internal
 */
export type FlatSetPosition = {
	/** The number of siblings that the tree shows, the row included. */
	setSize: number
	/** The 1-based position of the row among those siblings. */
	posInSet: number
}

/**
 * One row emitted by {@link flattenTree} for the virtualized tree: a `leaf`
 * scalar, a `branch-open` header, or a matching `branch-close` footer.
 *
 * @internal
 */
export type FlatNode =
	| ({
			type: 'leaf'
			path: string
			keyName: string | number | undefined
			value: JsonValue
			depth: number
			highlighted: boolean
	  } & FlatSetPosition)
	| ({
			type: 'branch-open'
			path: string
			keyName: string | number | undefined
			value: JsonValue[] | { [key: string]: JsonValue }
			depth: number
			open: boolean
			count: number
			highlighted: boolean
	  } & FlatSetPosition)
	| {
			type: 'branch-close'
			path: string
			depth: number
			value: JsonValue[] | { [key: string]: JsonValue }
	  }

/** Inputs to {@link flattenTree}. @internal */
type FlattenTreeOptions = {
	data: JsonValue
	rootKey: string | undefined
	/** Resolves whether the branch at `path` is open. The root has depth 0. */
	isOpen: (path: string, depth: number) => boolean
	search: string
	filter: boolean
	searchIndex: SearchIndex
}

/**
 * Walk a tree and return a flat list of rows in render order. `isOpen` decides
 * each branch, so the caller resolves open state per render. Each open branch
 * emits a `branch-open` row, its (possibly filtered) children, and a
 * `branch-close` row.
 *
 * When `search` is set and `filter` is true, non-matching leaves are omitted
 * and each branch keeps only children on a match path. A branch's open state
 * still follows `isOpen`. (Unlike the recursive renderer, this flatten pass
 * does not force match-free branches closed.)
 *
 * @internal
 */
export function flattenTree({
	data,
	rootKey,
	isOpen,
	search,
	filter,
	searchIndex,
}: FlattenTreeOptions): FlatNode[] {
	const rows: FlatNode[] = []

	function walk(
		value: JsonValue,
		keyName: string | number | undefined,
		path: string,
		depth: number,
		position: FlatSetPosition,
	) {
		const highlighted = search ? matchesSearch(keyName, value, search) : false

		if (!isBranch(value)) {
			if (filter && search && !highlighted) return

			rows.push({ type: 'leaf', path, keyName, value, depth, highlighted, ...position })

			return
		}

		const entries =
			filter && search ? filterEntries(getEntries(value), search, searchIndex) : getEntries(value)

		const open = isOpen(path, depth)

		const count = entries.length

		rows.push({
			type: 'branch-open',
			path,
			keyName,
			value,
			depth,
			open,
			count,
			highlighted,
			...position,
		})

		if (!open) return

		// A filtered search already dropped the siblings that it hides, so the
		// entries are the siblings that the tree shows.
		for (const [index, [childKey, childValue]] of entries.entries()) {
			const childPath = joinPath(path, childKey)

			walk(childValue, childKey, childPath, depth + 1, { setSize: count, posInSet: index + 1 })
		}

		rows.push({ type: 'branch-close', path, depth, value })
	}

	walk(data, rootKey, encodePathSegment(rootKey ?? '$'), 0, { setSize: 1, posInSet: 1 })

	return rows
}
