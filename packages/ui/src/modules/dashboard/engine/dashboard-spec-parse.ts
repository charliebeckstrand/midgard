/**
 * The guard for a spec that the app reads from storage.
 *
 * A saved spec can be stale or damaged: a tile can lose its kind, an id can
 * repeat, or an entry can outlive its tile. The parse repairs what it can. It
 * drops each part that the board cannot use, keeps each other part, and reports
 * each change. The board therefore always gets a usable spec, and the app decides
 * what to do with the report.
 */

import type { QueryGroup } from '../../query/engine/types'
import type { DashboardLayoutItem } from './dashboard-layout'
import type { DashboardSpec, DashboardSpecTile } from './dashboard-spec'

/** The kind of problem that {@link parseDashboardSpec} found. */
export type DashboardSpecIssueKind =
	/** The input is not an object, so the parse returns an empty spec. */
	| 'invalid-spec'
	/** `tiles` or `layout` is not an array, so it becomes empty. */
	| 'invalid-list'
	/** A tile has no string `id` or no string `widget`, so the parse drops it. */
	| 'invalid-tile'
	/** A tile repeats the `id` of an earlier tile, so the parse drops it. */
	| 'duplicate-tile'
	/** An optional field of a tile has the wrong shape, so the parse drops the field. */
	| 'invalid-field'
	/** An entry has no string `id`, or a number that is not finite, so the parse drops it. */
	| 'invalid-entry'
	/** An entry repeats the `id` of an earlier entry, so the parse drops it. */
	| 'duplicate-entry'
	/** An entry names no tile of the spec and no id of `tileIds`, so the parse drops it. */
	| 'orphan-entry'
	/** `filter` is not a query tree, so the parse drops it. */
	| 'invalid-filter'

/** One problem that {@link parseDashboardSpec} found, and repaired. */
export type DashboardSpecIssue = {
	/** The kind of problem. */
	kind: DashboardSpecIssueKind
	/** Where the problem is in the input, for example `tiles[2].title`. */
	path: string
	/** What the parse found and what it did, for a log. */
	message: string
}

/** Options for {@link parseDashboardSpec}. */
export type DashboardSpecParseOptions = {
	/**
	 * The ids of the JSX tiles that share the board with the spec tiles. The parse
	 * keeps the entry of each of these ids, as it keeps the entry of a spec tile.
	 *
	 * @remarks
	 * The layout binding saves the entries of all mounted tiles, JSX tiles included.
	 * Without these ids, each load drops the entries of the JSX tiles as orphans,
	 * so each JSX tile loses its saved place.
	 */
	tileIds?: Iterable<string>
}

/** The result of {@link parseDashboardSpec}. */
export type DashboardSpecParse = {
	/** The usable spec. */
	spec: DashboardSpec
	/** Each problem that the parse repaired, in input order. It is empty for a sound spec. */
	issues: DashboardSpecIssue[]
}

/** A plain object, which JSON gives for `{}`. */
type Fields = Record<string, unknown>

function isFields(value: unknown): value is Fields {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isId(value: unknown): value is string {
	return typeof value === 'string' && value !== ''
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

/** Whether a value is a query node: a rule, or a group whose children are all nodes. */
function isQueryNode(value: unknown): boolean {
	if (!isFields(value) || typeof value.id !== 'string') return false

	if (value.combinator !== undefined && value.combinator !== 'and' && value.combinator !== 'or') {
		return false
	}

	if (value.type === 'rule') {
		return typeof value.field === 'string' && typeof value.operator === 'string'
	}

	return (
		value.type === 'group' && Array.isArray(value.children) && value.children.every(isQueryNode)
	)
}

/** Whether a value is a span: a finite `w`, and a finite `h` when it has one. */
function isSize(value: unknown): boolean {
	return isFields(value) && isNumber(value.w) && (value.h === undefined || isNumber(value.h))
}

/** The optional fields of a tile, and the test that each value must pass. */
const TILE_FIELDS: readonly [key: keyof DashboardSpecTile, test: (value: unknown) => boolean][] = [
	['title', (value) => typeof value === 'string'],
	['description', (value) => typeof value === 'string'],
	['defaultSize', isSize],
]

/** Whether a value is a layout entry that the board can resolve. */
function isEntry(value: unknown): value is DashboardLayoutItem {
	return (
		isFields(value) &&
		isId(value.id) &&
		isNumber(value.x) &&
		isNumber(value.y) &&
		isNumber(value.w) &&
		(value.h === undefined || isNumber(value.h)) &&
		(value.static === undefined || typeof value.static === 'boolean')
	)
}

/** The list at `key`, or `[]` with an issue when it is not an array. */
function listOf(input: Fields, key: 'tiles' | 'layout', issues: DashboardSpecIssue[]): unknown[] {
	const list = input[key]

	if (Array.isArray(list)) return list

	if (list !== undefined) {
		issues.push({
			kind: 'invalid-list',
			path: key,
			message: `\`${key}\` is not an array. The spec has no ${key === 'tiles' ? 'tiles' : 'entries'}.`,
		})
	}

	return []
}

/** The tile, less each optional field that has the wrong shape. */
function repairTile(tile: Fields, path: string, issues: DashboardSpecIssue[]): DashboardSpecTile {
	let repaired: Fields = tile

	for (const [key, test] of TILE_FIELDS) {
		if (tile[key] === undefined || test(tile[key])) continue

		if (repaired === tile) repaired = { ...tile }

		delete repaired[key]

		issues.push({
			kind: 'invalid-field',
			path: `${path}.${key}`,
			message: `The \`${key}\` of tile "${tile.id}" has the wrong shape. The parse dropped it.`,
		})
	}

	return repaired as DashboardSpecTile
}

function parseTiles(list: readonly unknown[], issues: DashboardSpecIssue[]): DashboardSpecTile[] {
	const tiles: DashboardSpecTile[] = []

	const ids = new Set<string>()

	list.forEach((tile, index) => {
		const path = `tiles[${index}]`

		if (!isFields(tile) || !isId(tile.id) || !isId(tile.widget)) {
			issues.push({
				kind: 'invalid-tile',
				path,
				message: 'The tile has no string `id` or no string `widget`. The parse dropped it.',
			})

			return
		}

		if (ids.has(tile.id)) {
			issues.push({
				kind: 'duplicate-tile',
				path,
				message: `An earlier tile has the id "${tile.id}". The parse dropped this one.`,
			})

			return
		}

		ids.add(tile.id)

		tiles.push(repairTile(tile, path, issues))
	})

	return tiles
}

function parseLayout(
	list: readonly unknown[],
	tiles: ReadonlySet<string>,
	issues: DashboardSpecIssue[],
): DashboardLayoutItem[] {
	const layout: DashboardLayoutItem[] = []

	const ids = new Set<string>()

	list.forEach((entry, index) => {
		const path = `layout[${index}]`

		if (!isEntry(entry)) {
			issues.push({
				kind: 'invalid-entry',
				path,
				message:
					'The entry has no string `id`, or a number that is not finite. The parse dropped it.',
			})

			return
		}

		if (ids.has(entry.id)) {
			issues.push({
				kind: 'duplicate-entry',
				path,
				message: `An earlier entry has the id "${entry.id}". The parse dropped this one.`,
			})

			return
		}

		ids.add(entry.id)

		if (!tiles.has(entry.id)) {
			issues.push({
				kind: 'orphan-entry',
				path,
				message: `No tile has the id "${entry.id}". The parse dropped the entry.`,
			})

			return
		}

		layout.push(entry)
	})

	return layout
}

/**
 * Reads a spec from untrusted input, such as the result of `JSON.parse`, and
 * repairs it. It drops each part that the board cannot use, keeps each other
 * part, and reports each change.
 *
 * It drops a tile with no string `id` or `widget`, and a tile that repeats an id.
 * It drops an optional field of a tile that has the wrong shape. It drops an
 * entry that is malformed, repeats an id, or names no tile. It drops a `filter`
 * that is not a query tree.
 *
 * @remarks
 * The parse does not check the widget kinds, because a kind that no widget
 * claims keeps its tile and states the gap. It does not clamp the numbers of an
 * entry, because the board rounds and clamps each entry when it renders. A tile
 * or an entry with no issue keeps its object, unknown fields included.
 *
 * A board that puts JSX tiles beside `DashboardTiles` saves their entries too.
 * Pass their ids in `tileIds`, so that the parse keeps those entries.
 *
 * @example
 * ```ts
 * const { spec, issues } = parseDashboardSpec(JSON.parse(saved), { tileIds: ['notes'] })
 *
 * if (issues.length > 0) console.warn('Repaired the saved board', issues)
 * ```
 *
 * @param input - The stored value.
 * @param options - The ids of the JSX tiles on the same board.
 * @returns The usable spec, and each issue that the parse repaired.
 */
export function parseDashboardSpec(
	input: unknown,
	options: DashboardSpecParseOptions = {},
): DashboardSpecParse {
	const issues: DashboardSpecIssue[] = []

	if (!isFields(input)) {
		issues.push({
			kind: 'invalid-spec',
			path: '',
			message: 'The spec is not an object. The parse returned an empty spec.',
		})

		return { spec: { tiles: [], layout: [] }, issues }
	}

	const tiles = parseTiles(listOf(input, 'tiles', issues), issues)

	const known = new Set(tiles.map((tile) => tile.id))

	for (const id of options.tileIds ?? []) known.add(id)

	const layout = parseLayout(listOf(input, 'layout', issues), known, issues)

	const spec: DashboardSpec = { tiles, layout }

	// JSON has no `undefined`, so a saved board with no filter can hold `null`.
	if (input.filter == null) return { spec, issues }

	if (isFields(input.filter) && input.filter.type === 'group' && isQueryNode(input.filter)) {
		spec.filter = input.filter as QueryGroup
	} else {
		issues.push({
			kind: 'invalid-filter',
			path: 'filter',
			message: 'The filter is not a query tree. The parse dropped it.',
		})
	}

	return { spec, issues }
}
