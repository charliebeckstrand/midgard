// @vitest-environment node
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { DashboardSpec } from '../../modules/dashboard/engine/dashboard-spec'
import {
	type DashboardSpecParseOptions,
	parseDashboardSpec,
} from '../../modules/dashboard/engine/dashboard-spec-parse'

const SOUND: DashboardSpec = {
	tiles: [
		{ id: 'a', widget: 'bar', title: 'Revenue', options: { by: 'region' } },
		{ id: 'b', widget: 'stat', defaultSize: { w: 6, h: 16 } },
	],
	layout: [
		{ id: 'a', x: 0, y: 0, w: 12 },
		{ id: 'b', x: 12, y: 0, w: 6, h: 16, static: true },
	],
	filter: {
		id: 'root',
		type: 'group',
		combinator: 'and',
		children: [
			{ id: 'r1', type: 'rule', field: 'region', operator: 'equals', value: 'West' },
			{ id: 'g1', type: 'group', children: [] },
		],
	},
}

/** The kind and the path of each issue. */
function found(input: unknown): [string, string][] {
	return parseDashboardSpec(input).issues.map((issue) => [issue.kind, issue.path])
}

describe('parseDashboardSpec', () => {
	it('keeps a sound spec whole, through a JSON round trip, with no issue', () => {
		const { spec, issues } = parseDashboardSpec(JSON.parse(JSON.stringify(SOUND)))

		expect(spec).toEqual(SOUND)

		expect(issues).toEqual([])
	})

	it('keeps the object of each tile and entry with no issue, unknown fields included', () => {
		const tile = { id: 'a', widget: 'bar', pinned: true }

		const entry = { id: 'a', x: 0, y: 0, w: 12, note: 'kept' }

		const { spec } = parseDashboardSpec({ tiles: [tile], layout: [entry] })

		expect(spec.tiles[0]).toBe(tile)

		expect(spec.layout[0]).toBe(entry)
	})

	it('returns an empty spec for an input that is not an object', () => {
		for (const input of [null, 'board', 42, []]) {
			const { spec, issues } = parseDashboardSpec(input)

			expect(spec).toEqual({ tiles: [], layout: [] })

			expect(issues.map((issue) => issue.kind)).toEqual(['invalid-spec'])
		}
	})

	it('empties a list that is not an array, and accepts a missing one', () => {
		expect(found({ tiles: {}, layout: 'none' })).toEqual([
			['invalid-list', 'tiles'],
			['invalid-list', 'layout'],
		])

		expect(parseDashboardSpec({})).toEqual({ spec: { tiles: [], layout: [] }, issues: [] })
	})

	it('drops a tile with no id or no kind, and a tile that repeats an id', () => {
		const { spec, issues } = parseDashboardSpec({
			tiles: [
				{ id: 'a', widget: 'bar' },
				{ widget: 'bar' },
				{ id: 'b', widget: '' },
				'c',
				{ id: 'a', widget: 'stat' },
				{ id: 'd', widget: 'stat' },
			],
			layout: [],
		})

		expect(spec.tiles.map((tile) => `${tile.id}:${tile.widget}`)).toEqual(['a:bar', 'd:stat'])

		expect(issues.map((issue) => [issue.kind, issue.path])).toEqual([
			['invalid-tile', 'tiles[1]'],
			['invalid-tile', 'tiles[2]'],
			['invalid-tile', 'tiles[3]'],
			['duplicate-tile', 'tiles[4]'],
		])

		expect(issues[3]?.message).toBe('An earlier tile has the id "a". The parse dropped this one.')
	})

	it('drops an optional field with the wrong shape, and keeps the rest of the tile', () => {
		const tile = {
			id: 'a',
			widget: 'bar',
			title: 7,
			description: 'Kept',
			defaultSize: { w: 'wide' },
			options: { by: 'region' },
		}

		const { spec, issues } = parseDashboardSpec({ tiles: [tile], layout: [] })

		expect(spec.tiles).toEqual([
			{ id: 'a', widget: 'bar', description: 'Kept', options: { by: 'region' } },
		])

		expect(issues.map((issue) => [issue.kind, issue.path])).toEqual([
			['invalid-field', 'tiles[0].title'],
			['invalid-field', 'tiles[0].defaultSize'],
		])

		// The input stays as it was.
		expect(tile.title).toBe(7)
	})

	it('drops an entry that is malformed, repeats an id, or names no tile', () => {
		const { spec, issues } = parseDashboardSpec({
			tiles: [
				{ id: 'a', widget: 'bar' },
				{ id: 'b', widget: 'bar' },
			],
			layout: [
				{ id: 'a', x: 0, y: 0, w: 12 },
				{ id: 'b', x: 12, y: null, w: 12 },
				{ id: 'b', x: 12, y: 0, w: 12, h: '10' },
				{ id: 'b', x: 12, y: 0, w: 12, static: 'yes' },
				{ x: 0, y: 0, w: 1 },
				{ id: 'a', x: 0, y: 30, w: 24 },
				{ id: 'gone', x: 0, y: 40, w: 24 },
			],
		})

		expect(spec.layout).toEqual([{ id: 'a', x: 0, y: 0, w: 12 }])

		expect(issues.map((issue) => [issue.kind, issue.path])).toEqual([
			['invalid-entry', 'layout[1]'],
			['invalid-entry', 'layout[2]'],
			['invalid-entry', 'layout[3]'],
			['invalid-entry', 'layout[4]'],
			['duplicate-entry', 'layout[5]'],
			['orphan-entry', 'layout[6]'],
		])
	})

	it('names a static that is not a boolean in the message of a malformed entry', () => {
		const { issues } = parseDashboardSpec({
			tiles: [{ id: 'a', widget: 'bar' }],
			layout: [{ id: 'a', x: 0, y: 0, w: 12, static: 'yes' }],
		})

		expect(issues).toEqual([
			{
				kind: 'invalid-entry',
				path: 'layout[0]',
				message: expect.stringContaining('a `static` that is not a boolean'),
			},
		])
	})

	it('checks the entries against the tiles that survive the parse', () => {
		expect(
			found({
				tiles: [{ id: 'a' }],
				layout: [{ id: 'a', x: 0, y: 0, w: 12 }],
			}),
		).toEqual([
			['invalid-tile', 'tiles[0]'],
			['orphan-entry', 'layout[0]'],
		])
	})

	it('keeps the entry of each JSX tile that the options name', () => {
		const notes = { id: 'notes', x: 12, y: 0, w: 12, h: 10 }

		const input = {
			tiles: [{ id: 'a', widget: 'bar' }],
			layout: [{ id: 'a', x: 0, y: 0, w: 12 }, notes, { id: 'gone', x: 0, y: 40, w: 24 }],
		}

		const { spec, issues } = parseDashboardSpec(input, { tileIds: ['notes'] })

		expect(spec.layout.map((entry) => entry.id)).toEqual(['a', 'notes'])

		expect(spec.layout[1]).toBe(notes)

		expect(issues.map((issue) => [issue.kind, issue.path])).toEqual([['orphan-entry', 'layout[2]']])

		expect(parseDashboardSpec(input, { tileIds: new Set(['notes']) }).spec.layout).toContain(notes)

		// A bare string is iterable, and a loop over it yields letters, so the type refuses it.
		expectTypeOf<string>().not.toExtend<NonNullable<DashboardSpecParseOptions['tileIds']>>()

		// With no options, the entry of the JSX tile is an orphan.
		expect(found(input)).toEqual([
			['orphan-entry', 'layout[1]'],
			['orphan-entry', 'layout[2]'],
		])
	})

	it('keeps the numbers of an entry as saved, for the board to clamp', () => {
		const entry = { id: 'a', x: -3, y: 2.6, w: 40 }

		const { spec, issues } = parseDashboardSpec({
			tiles: [{ id: 'a', widget: 'bar' }],
			layout: [entry],
		})

		expect(spec.layout[0]).toBe(entry)

		expect(issues).toEqual([])
	})

	it('drops a filter that is not a query tree, and accepts a null one', () => {
		const tiles: unknown[] = []

		for (const filter of [
			'region = West',
			{ id: 'r', type: 'rule', field: 'region', operator: 'equals', value: 'West' },
			{ id: 'root', type: 'group' },
			{ id: 'root', type: 'group', children: [{ id: 'r', type: 'rule', field: 'region' }] },
			{ id: 'root', type: 'group', combinator: 'xor', children: [] },
		]) {
			const { spec, issues } = parseDashboardSpec({ tiles, layout: [], filter })

			expect(spec.filter).toBeUndefined()

			expect(issues.map((issue) => [issue.kind, issue.path])).toEqual([
				['invalid-filter', 'filter'],
			])
		}

		expect(parseDashboardSpec({ tiles, layout: [], filter: null })).toEqual({
			spec: { tiles: [], layout: [] },
			issues: [],
		})
	})

	it('drops a filter deeper than 32 levels with an issue, and does not throw', () => {
		/** A filter of `levels` nested groups, read from JSON as storage gives it. */
		const nested = (levels: number): unknown =>
			JSON.parse(`${'{"id":"g","type":"group","children":['.repeat(levels)}${']}'.repeat(levels)}`)

		for (const levels of [33, 100_000]) {
			const { spec, issues } = parseDashboardSpec({ tiles: [], layout: [], filter: nested(levels) })

			expect(spec.filter === undefined).toBe(true)

			expect(issues.map((issue) => [issue.kind, issue.path])).toEqual([
				['invalid-filter', 'filter'],
			])
		}

		expect(parseDashboardSpec({ tiles: [], layout: [], filter: nested(32) }).issues).toEqual([])
	})
})
