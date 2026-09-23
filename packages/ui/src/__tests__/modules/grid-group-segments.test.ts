// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import type { Row } from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import type { GridGroupHeaderRow } from '../../modules/grid'
import {
	type GridManualGroupSegment,
	orderManualGroupSegments,
	segmentManualGroupRows,
} from '../../modules/grid/engine/grid-group/segments'

/** A manual display row: a group header when it carries `group`, else a leaf. */
type Item = { id: string; group?: GridGroupHeaderRow }

/** The engine reads `original` alone, so a row needs nothing else. */
function rows(items: Item[]): Row<Item>[] {
	return items.map((original) => ({ original }) as Row<Item>)
}

const groupRow = (item: Item) => item.group ?? null

const header = (id: string, value: unknown): Item => ({
	id,
	group: { key: id, value, count: 0 },
})

const leaf = (id: string): Item => ({ id })

/** Each segment as its header id (or `null`) and its leaf ids, for a readable assertion. */
function shape(segments: GridManualGroupSegment<Item>[]) {
	return segments.map((segment) => [
		segment.header?.original.id ?? null,
		segment.leaves.map((row) => row.original.id),
	])
}

describe('segmentManualGroupRows', () => {
	it('opens a segment at each header and collects the leaves up to the next', () => {
		const segments = segmentManualGroupRows(
			rows([header('A', 'a'), leaf('a1'), leaf('a2'), header('B', 'b'), leaf('b1')]),
			groupRow,
		)

		expect(shape(segments)).toEqual([
			['A', ['a1', 'a2']],
			['B', ['b1']],
		])
	})

	it('collects leaves before any header into a leading headerless segment', () => {
		const segments = segmentManualGroupRows(
			rows([leaf('x'), leaf('y'), header('A', 'a'), leaf('a1')]),
			groupRow,
		)

		expect(shape(segments)).toEqual([
			[null, ['x', 'y']],
			['A', ['a1']],
		])

		expect(segments[0]?.info).toBeNull()
	})

	it('keeps a header with no leaves as an empty segment', () => {
		const segments = segmentManualGroupRows(rows([header('A', 'a'), header('B', 'b')]), groupRow)

		expect(shape(segments)).toEqual([
			['A', []],
			['B', []],
		])
	})

	it('resolves the header descriptor once, onto the segment', () => {
		const [segment] = segmentManualGroupRows(rows([header('A', 'a')]), groupRow)

		expect(segment?.info).toEqual({ key: 'A', value: 'a', count: 0 })
	})

	it('returns no segments for no rows', () => {
		expect(segmentManualGroupRows([], groupRow)).toEqual([])
	})
})

describe('orderManualGroupSegments', () => {
	const segments = () =>
		segmentManualGroupRows(
			rows([
				leaf('x'),
				header('B', 'beta'),
				leaf('b1'),
				leaf('b2'),
				header('A', 'alpha'),
				leaf('a1'),
				header('C', 'gamma'),
			]),
			groupRow,
		)

	it('returns the segments untouched when no group sort is active', () => {
		const input = segments()

		expect(orderManualGroupSegments(input, null)).toBe(input)
	})

	it('sorts the header segments by value ascending, headerless run first', () => {
		expect(shape(orderManualGroupSegments(segments(), 'asc'))).toEqual([
			[null, ['x']],
			['A', ['a1']],
			['B', ['b1', 'b2']],
			['C', []],
		])
	})

	it('sorts descending and still keeps the headerless run first', () => {
		expect(shape(orderManualGroupSegments(segments(), 'desc'))).toEqual([
			[null, ['x']],
			['C', []],
			['B', ['b1', 'b2']],
			['A', ['a1']],
		])
	})

	it('compares values naturally, so 10 follows 9', () => {
		const ordered = orderManualGroupSegments(
			segmentManualGroupRows(rows([header('T', 10), header('N', 9)]), groupRow),
			'asc',
		)

		expect(shape(ordered).map(([id]) => id)).toEqual(['N', 'T'])
	})
})

/** A display row list: leaves and headers in any order, ids unique by position. */
const items = () =>
	fc
		.array(fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }), { maxLength: 30 })
		.map((values) =>
			values.map((value, index) =>
				value === undefined ? leaf(`l${index}`) : header(`h${index}`, value),
			),
		)

describe('segmentManualGroupRows: properties', () => {
	test.prop([items()])('reads every row exactly once, in the supplied order', (list) => {
		const flat = segmentManualGroupRows(rows(list), groupRow).flatMap((segment) => [
			...(segment.header ? [segment.header] : []),
			...segment.leaves,
		])

		expect(flat.map((row) => row.original.id)).toEqual(list.map((item) => item.id))
	})

	test.prop([items()])(
		'holds no header among the leaves, and only the first segment headerless',
		(list) => {
			const segments = segmentManualGroupRows(rows(list), groupRow)

			for (const [index, segment] of segments.entries()) {
				expect(segment.leaves.every((row) => groupRow(row.original) === null)).toBe(true)

				if (segment.header === null) expect(index).toBe(0)
			}
		},
	)
})

describe('orderManualGroupSegments: properties', () => {
	test.prop([items(), fc.constantFrom('asc' as const, 'desc' as const)])(
		'moves whole segments, so each header keeps its own leaves',
		(list, direction) => {
			const before = segmentManualGroupRows(rows(list), groupRow)

			const after = orderManualGroupSegments(before, direction)

			expect(after).toHaveLength(before.length)

			expect(new Set(after)).toEqual(new Set(before))
		},
	)

	test.prop([items()])(
		'orders descending as the reverse of ascending over distinct values',
		(list) => {
			const distinct = list.filter(
				(item, index) =>
					!item.group ||
					list.findIndex((other) => other.group?.value === item.group?.value) === index,
			)

			const segments = segmentManualGroupRows(rows(distinct), groupRow)

			const headed = (direction: 'asc' | 'desc') =>
				orderManualGroupSegments(segments, direction).filter((segment) => segment.header)

			expect(headed('desc')).toEqual(headed('asc').reverse())
		},
	)
})
