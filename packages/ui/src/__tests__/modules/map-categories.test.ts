// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cn } from '../../core/cn'
import { paletteSlot } from '../../modules/chart/engine/chart-color/palette'
import {
	paintFill,
	paintStripes,
	paintText,
	regionCategoryIndexes,
	resolveCategories,
} from '../../modules/map/engine/map-region/category'
import type { MapSeriesColor } from '../../recipes/kata/map'
import { k } from '../../recipes/kata/map'
import { FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * The paint a category resolved from a given slot. The slot itself is spent
 * building this and kept nowhere, so the paint is where a color assertion
 * reads it back.
 */
const slotPaint = (color: MapSeriesColor) => ({
	kind: 'class',
	fill: k.series[color].fill,
	text: k.series[color].text,
})

describe('a category tone and stripes', () => {
	it('paints a soft category in the soft step of its slot', () => {
		const [meta] = resolveCategories(FIXTURE_ROWS, 'zone', [
			{ value: 'East', color: 'red', tone: 'soft' },
		])

		expect(meta?.paint).toEqual({ kind: 'class', fill: k.soft.red.fill, text: k.soft.red.text })
	})

	it('paints a striped category with both slots, in its tone', () => {
		const [solid, soft] = resolveCategories(FIXTURE_ROWS, 'zone', [
			{ value: 'East', color: 'blue', stripes: 'red' },
			{ value: 'West', color: 'blue', stripes: 'red', tone: 'soft' },
		])

		expect(solid?.paint).toEqual({
			kind: 'stripes',
			first: { fill: k.series.blue.fill, text: k.series.blue.text },
			second: { fill: k.series.red.fill, text: k.series.red.text },
		})

		expect(soft?.paint).toMatchObject({ kind: 'stripes', second: { fill: k.soft.red.fill } })
	})

	it('keys the swatch of a striped category to its first color, with the second as stripes', () => {
		const [striped, plain] = resolveCategories(FIXTURE_ROWS, 'zone', [
			{ value: 'East', color: 'blue', stripes: 'red' },
			{ value: 'West', color: 'blue' },
		])

		if (!striped || !plain) throw new Error('expected two categories')

		expect(paintText(striped.paint)).toBe(cn(...k.series.blue.text))

		expect(paintStripes(striped.paint)).toBe(cn(...k.series.red.text))

		expect(paintStripes(plain.paint)).toBeUndefined()

		expect(paintFill(striped.paint)).toBeUndefined()
	})
})

describe('paletteSlot', () => {
	it('walks the fixed order and wraps past the eighth slot', () => {
		expect(paletteSlot(0)).toBe('blue')

		expect(paletteSlot(1)).toBe('orange')

		expect(paletteSlot(8)).toBe('blue')
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

	it('lets an explicit list set the order, labels, and colors', () => {
		const metas = resolveCategories(FIXTURE_ROWS, 'zone', [
			{ value: 'West', label: 'Western', color: 'rose' },
			{ value: 'East' },
		])

		expect(metas[0]).toMatchObject({ value: 'West', label: 'Western', paint: slotPaint('rose') })

		// An explicit color still occupies its slot position.
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
