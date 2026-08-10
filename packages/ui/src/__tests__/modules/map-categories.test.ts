import { describe, expect, it } from 'vitest'
import {
	regionCategoryIndexes,
	resolveCategories,
	slotColor,
} from '../../modules/map/engine/map-region/category'
import type { MapSeriesColor } from '../../recipes/kata/map'
import { k } from '../../recipes/kata/map'
import { FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * The paint a category resolved from a given slot. The slot itself is spent
 * building this and kept nowhere, so the paint is where a colour assertion
 * reads it back.
 */
const slotPaint = (color: MapSeriesColor) => ({
	kind: 'class',
	fill: k.series[color].fill,
	text: k.series[color].text,
})

describe('slotColor', () => {
	it('walks the fixed order and wraps past the eighth slot', () => {
		expect(slotColor(0)).toBe('blue')

		expect(slotColor(1)).toBe('orange')

		expect(slotColor(8)).toBe('blue')
	})
})

describe('resolveCategories', () => {
	it('derives categories from the rows in first-appearance order', () => {
		const rows = [
			{ id: '1', kind: 'b' },
			{ id: '2', kind: 'a' },
			{ id: '3', kind: 'b' },
		]

		const metas = resolveCategories(rows, 'kind')

		expect(metas.map((meta) => meta.value)).toEqual(['b', 'a'])

		expect(metas.map((meta) => meta.paint)).toEqual([slotPaint('blue'), slotPaint('orange')])
	})

	it('lets an explicit list set the order, labels, and colours', () => {
		const metas = resolveCategories(FIXTURE_ROWS, 'zone', [
			{ value: 'West', label: 'Western', color: 'rose' },
			{ value: 'East' },
		])

		expect(metas[0]).toMatchObject({ value: 'West', label: 'Western', paint: slotPaint('rose') })

		// An explicit colour still occupies its slot position.
		expect(metas[1]).toMatchObject({ value: 'East', label: 'East', paint: slotPaint('orange') })
	})
})

describe('regionCategoryIndexes', () => {
	const metas = resolveCategories(FIXTURE_ROWS, 'zone')

	it('matches each region to its category by row id', () => {
		expect(regionCategoryIndexes(['A', 'B'], FIXTURE_ROWS, 'state', 'zone', metas)).toEqual([0, 1])
	})

	it('leaves unmatched regions null', () => {
		expect(regionCategoryIndexes(['C'], FIXTURE_ROWS, 'state', 'zone', metas)).toEqual([null])
	})

	it('leaves a region null when its value names no listed category', () => {
		const limited = resolveCategories(FIXTURE_ROWS, 'zone', [{ value: 'East' }])

		expect(regionCategoryIndexes(['A', 'B'], FIXTURE_ROWS, 'state', 'zone', limited)).toEqual([
			0,
			null,
		])
	})
})
