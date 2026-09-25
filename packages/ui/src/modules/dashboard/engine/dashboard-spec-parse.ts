/**
 * The guards for a spec and a selection value that the app reads from storage.
 *
 * A saved spec can be stale or damaged: a tile can lose its kind, an id can
 * repeat, or an entry can outlive its tile. The parse repairs what it can. It
 * drops each part that the board cannot use, keeps each other part, and reports
 * each change. The board therefore always gets a usable spec, and the app decides
 * what to do with the report. The parse of a selection value works the same way.
 */

import { isQueryGroup, MAX_DEPTH } from '../../query/engine/query-node'
import type { DashboardLayoutItem } from './dashboard-layout'
import type { DashboardSelection } from './dashboard-scope'
import type { DashboardSpec, DashboardSpecTile } from './dashboard-spec'

/**
 * The kind of problem that {@link parseDashboardSpec} or
 * {@link parseDashboardSelection} found.
 */
export type DashboardSpecIssueKind =
	/** The input is not an object, so the parse returns an empty spec. */
	| 'invalid-spec'
	/** `tiles`, `layout`, or a selection value is not an array, so it becomes empty. */
	| 'invalid-list'
	/** A tile has no string `id` or no string `widget`, so the parse drops it. */
	| 'invalid-tile'
	/** A tile repeats the `id` of an earlier tile, so the parse drops it. */
	| 'duplicate-tile'
	/** An optional field of a tile has the wrong shape, so the parse drops the field. */
	| 'invalid-field'
	/**
	 * An entry has no string `id`, a number that is not finite, or a `static` that
	 * is not a boolean. The parse drops it.
	 */
	| 'invalid-entry'
	/** An entry repeats the `id` of an earlier entry, so the parse drops it. */
	| 'duplicate-entry'
	/** An entry names no tile of the spec and no id of `tileIds`, so the parse drops it. */
	| 'orphan-entry'
	/** `filter` is not a query tree, or it is deeper than 32 levels, so the parse drops it. */
	| 'invalid-filter'
	/**
	 * A selection has no string `source`, no string `field`, or `values` that is
	 * not a list of strings. A selection with no values filters nothing, so it
	 * gets this issue too. The parse drops it.
	 */
	| 'invalid-selection'
	/**
	 * A selection repeats the `source` and the `field` of an earlier selection.
	 * The scope joins the two with `and`, so the parse drops the later one.
	 */
	| 'duplicate-selection'

/**
 * One problem that {@link parseDashboardSpec} or {@link parseDashboardSelection}
 * found, and repaired.
 */
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
	tileIds?: readonly string[] | ReadonlySet<string>
}

/** The result of {@link parseDashboardSpec}. */
export type DashboardSpecParse = {
	/** The usable spec. */
	spec: DashboardSpec
	/** Each problem that the parse repaired, in input order. It is empty for a sound spec. */
	issues: DashboardSpecIssue[]
}

/** The result of {@link parseDashboardSelection}. */
export type DashboardSelectionParse = {
	/** The usable selections. */
	selections: DashboardSelection[]
	/** Each problem that the parse repaired, in input order. It is empty for a sound value. */
	issues: DashboardSpecIssue[]
}

/** A plain object, which JSON gives for `{}`. */
type Fields = Record<string, unknown>

function isFields(value: unknown): value is Fields {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a value is a tile id: a string that is not empty. The scope reads the
 * empty source as the board, so an empty id names no tile.
 *
 * @internal
 */
export function isId(value: unknown): value is string {
	return typeof value === 'string' && value !== ''
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Whether a value is a span: a finite `w`, and a finite `h` when it has one. A
 * layout entry holds its span in the same two fields.
 */
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
		isSize(value) &&
		(value.static === undefined || typeof value.static === 'boolean')
	)
}

/** Whether a value is a selection that the scope can apply. */
function isSelection(value: unknown): value is DashboardSelection {
	return (
		isFields(value) &&
		typeof value.source === 'string' &&
		typeof value.field === 'string' &&
		Array.isArray(value.values) &&
		value.values.every((item) => typeof item === 'string')
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
					'The entry has no string `id`, a number that is not finite, or a `static` that is not a boolean. The parse dropped it.',
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
 * that is not a query tree, or that is deeper than 32 levels.
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

	if (isQueryGroup(input.filter)) {
		spec.filter = input.filter
	} else {
		issues.push({
			kind: 'invalid-filter',
			path: 'filter',
			message: `The filter is not a query tree, or it is deeper than ${MAX_DEPTH} levels. The parse dropped it.`,
		})
	}

	return { spec, issues }
}

/**
 * Reads a selection value from untrusted input, such as the result of
 * `JSON.parse`, and repairs it. It drops each selection that the scope cannot
 * apply, keeps each other selection, and reports each change.
 *
 * A selection needs a string `source`, a string `field`, and `values` that is a
 * list of one or more strings. The board reads the selection value as given, so
 * a malformed selection throws when a tile reads the scope. Read a saved value
 * through this parse before you give it to the `selection` binding.
 *
 * @remarks
 * An absent value, `null` or `undefined`, gives no selection and no issue. A
 * selection with no values filters nothing, but its tile still shows a Clear
 * control, so the parse drops it. Each source keeps one selection for each
 * field, so the parse keeps the first selection of each `source` and `field`.
 * It drops each later one. A selection with no issue keeps its object, unknown
 * fields included.
 *
 * @example
 * ```tsx
 * const { selections, issues } = parseDashboardSelection(JSON.parse(saved))
 *
 * if (issues.length > 0) console.warn('Repaired the saved selection', issues)
 *
 * <Dashboard aria-label="Sales" selection={{ defaultValue: selections }}>…</Dashboard>
 * ```
 *
 * @param input - The stored value.
 * @returns The usable selections, and each issue that the parse repaired.
 */
export function parseDashboardSelection(input: unknown): DashboardSelectionParse {
	const issues: DashboardSpecIssue[] = []

	if (!Array.isArray(input)) {
		if (input != null) {
			issues.push({
				kind: 'invalid-list',
				path: '',
				message: 'The selection value is not an array. The parse returned no selections.',
			})
		}

		return { selections: [], issues }
	}

	const selections: DashboardSelection[] = []

	input.forEach((selection: unknown, index) => {
		const path = `[${index}]`

		if (!isSelection(selection)) {
			issues.push({
				kind: 'invalid-selection',
				path,
				message:
					'The selection has no string `source`, no string `field`, or `values` that is not a list of strings. The parse dropped it.',
			})

			return
		}

		if (selection.values.length === 0) {
			issues.push({
				kind: 'invalid-selection',
				path,
				message: 'The selection has no values, so it filters nothing. The parse dropped it.',
			})

			return
		}

		const { source, field } = selection

		if (selections.some((item) => item.source === source && item.field === field)) {
			issues.push({
				kind: 'duplicate-selection',
				path,
				message: `An earlier selection has the source "${source}" and the field "${field}". The parse dropped this one.`,
			})

			return
		}

		selections.push(selection)
	})

	return { selections, issues }
}
