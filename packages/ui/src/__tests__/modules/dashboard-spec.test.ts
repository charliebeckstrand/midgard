// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	addSpecTile,
	type DashboardSpec,
	duplicateSpecTile,
	nextSpecTileId,
	removeSpecTile,
} from '../../modules/dashboard/engine/dashboard-spec'

const SPEC: DashboardSpec = {
	tiles: [
		{ id: 'tile-1', widget: 'bar', title: 'Revenue', options: { by: 'region' } },
		{ id: 'tile-2', widget: 'stat', title: 'Units' },
		{ id: 'tile-3', widget: 'grid', title: 'Orders', defaultSize: { w: 24, h: 44 } },
	],
	layout: [
		// A ratio tile saves no `h`.
		{ id: 'tile-1', x: 0, y: 0, w: 12 },
		{ id: 'tile-2', x: 12, y: 0, w: 6, h: 16 },
	],
}

describe('nextSpecTileId', () => {
	it('takes the first number that no tile and no entry uses', () => {
		expect(nextSpecTileId(SPEC)).toBe('tile-4')

		expect(nextSpecTileId({ tiles: [], layout: [] })).toBe('tile-1')

		expect(nextSpecTileId(SPEC, 'chart')).toBe('chart-1')
	})

	it('skips an id that only a stale entry holds', () => {
		const spec = { ...SPEC, layout: [...SPEC.layout, { id: 'tile-4', x: 0, y: 40, w: 8 }] }

		expect(nextSpecTileId(spec)).toBe('tile-5')
	})
})

describe('addSpecTile', () => {
	it('adds the tile at the end with no layout entry', () => {
		const next = addSpecTile(SPEC, { id: 'tile-4', widget: 'stat' })

		expect(next.tiles.map((tile) => tile.id)).toEqual(['tile-1', 'tile-2', 'tile-3', 'tile-4'])

		expect(next.layout).toBe(SPEC.layout)

		// The tiles that the add does not touch keep their objects.
		expect(next.tiles[0]).toBe(SPEC.tiles[0])
	})

	it('drops a stale entry with the same id', () => {
		const spec = { ...SPEC, layout: [...SPEC.layout, { id: 'tile-4', x: 0, y: 40, w: 8 }] }

		const next = addSpecTile(spec, { id: 'tile-4', widget: 'stat' })

		expect(next.layout.map((item) => item.id)).toEqual(['tile-1', 'tile-2'])
	})

	it('returns the same spec when the id is taken', () => {
		expect(addSpecTile(SPEC, { id: 'tile-2', widget: 'bar' })).toBe(SPEC)
	})

	it('keeps the filter', () => {
		const filter = { id: 'filter', type: 'group' as const, children: [] }

		expect(addSpecTile({ ...SPEC, filter }, { id: 'tile-4', widget: 'stat' }).filter).toBe(filter)
	})
})

describe('removeSpecTile', () => {
	it('drops the tile and its layout entry', () => {
		const next = removeSpecTile(SPEC, 'tile-2')

		expect(next.tiles.map((tile) => tile.id)).toEqual(['tile-1', 'tile-3'])

		expect(next.layout).toEqual([{ id: 'tile-1', x: 0, y: 0, w: 12 }])
	})

	it('drops a tile that has no entry yet', () => {
		const next = removeSpecTile(SPEC, 'tile-3')

		expect(next.tiles.map((tile) => tile.id)).toEqual(['tile-1', 'tile-2'])

		expect(next.layout).toBe(SPEC.layout)
	})

	it('drops a stale entry that has no tile', () => {
		const spec = { ...SPEC, layout: [...SPEC.layout, { id: 'gone', x: 0, y: 40, w: 8 }] }

		expect(removeSpecTile(spec, 'gone').layout).toEqual(SPEC.layout)
	})

	it('returns the same spec for an id that it does not hold', () => {
		expect(removeSpecTile(SPEC, 'missing')).toBe(SPEC)
	})
})

describe('duplicateSpecTile', () => {
	it('inserts the copy right after its source, with the span of the source entry', () => {
		const next = duplicateSpecTile(SPEC, 'tile-2')

		expect(next.tiles.map((tile) => tile.id)).toEqual(['tile-1', 'tile-2', 'tile-4', 'tile-3'])

		expect(next.tiles[2]).toEqual({
			id: 'tile-4',
			widget: 'stat',
			title: 'Units',
			defaultSize: { w: 6, h: 16 },
		})

		// The copy has no entry, so the board places it under the lowest tile.
		expect(next.layout).toBe(SPEC.layout)
	})

	it('copies only the width of a ratio tile, and shares its options', () => {
		const next = duplicateSpecTile(SPEC, 'tile-1')

		const copy = next.tiles[1]

		expect(copy?.defaultSize).toEqual({ w: 12 })

		expect(copy?.options).toBe(SPEC.tiles[0]?.options)
	})

	it('takes the default size of a source with no entry', () => {
		const next = duplicateSpecTile(SPEC, 'tile-3')

		expect(next.tiles[3]).toMatchObject({ id: 'tile-4', defaultSize: { w: 24, h: 44 } })
	})

	it('gives a source with no entry and no default size a copy with none', () => {
		const spec = { tiles: [{ id: 'a', widget: 'stat' }], layout: [] }

		expect(duplicateSpecTile(spec, 'a').tiles[1]).toEqual({ id: 'tile-1', widget: 'stat' })
	})

	it('takes the copy id that the caller names, and drops a stale entry of it', () => {
		const spec = { ...SPEC, layout: [...SPEC.layout, { id: 'copy', x: 0, y: 40, w: 8 }] }

		const next = duplicateSpecTile(spec, 'tile-2', 'copy')

		expect(next.tiles[2]?.id).toBe('copy')

		expect(next.layout.map((item) => item.id)).toEqual(['tile-1', 'tile-2'])
	})

	it('returns the same spec for an unknown source or a taken copy id', () => {
		expect(duplicateSpecTile(SPEC, 'missing')).toBe(SPEC)

		expect(duplicateSpecTile(SPEC, 'tile-1', 'tile-2')).toBe(SPEC)
	})
})
