// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { categorySlots } from '../../modules/chart/engine/chart-color/palette'
import { litOverlay } from '../../modules/chart/engine/chart-marks/bar'
import { selectedIndices } from '../../modules/chart/engine/chart-series'
import { chartMarkEmphasis } from '../../modules/chart/engine/context'
import { sliceGroupClass } from '../../modules/chart/sector-chart/sector-chart-marks'

const noop = () => {}

describe('selectedIndices', () => {
	it('resolves the selected categories to data indices, as text', () => {
		expect(selectedIndices(['North', 'South', 'West', 2024], ['South', '2024'])).toEqual(
			new Set([1, 3]),
		)
	})

	it('selects nothing for an empty or missing list', () => {
		expect(selectedIndices(['North'], [])).toBeNull()

		expect(selectedIndices(['North'], undefined)).toBeNull()
	})
})

describe('chartMarkEmphasis with a held selection', () => {
	const selected = new Set([1])

	it('lights the selected data, and keeps a whole series lit', () => {
		const { lit } = chartMarkEmphasis(null, null, noop, selected)

		expect([lit(0, 0), lit(0, 1), lit(1, 1)]).toEqual([false, true, true])

		// A series-level group, such as a line stroke, never dims for a category.
		expect(lit(0)).toBe(true)
	})

	it('ignores the pointer while a selection is held, and keeps the pointed mark', () => {
		const { lit, mark } = chartMarkEmphasis({ series: 0, datum: 2 }, null, noop, selected)

		expect([lit(0, 1), lit(0, 2)]).toEqual([true, false])

		// The tooltip still reads the pointed mark.
		expect(mark).toEqual({ series: 0, datum: 2 })
	})

	it('lets the pointer isolate a mark when nothing is selected', () => {
		const { lit } = chartMarkEmphasis({ series: 0, datum: 2 }, null, noop, null)

		expect([lit(0, 1), lit(0, 2)]).toEqual([false, true])
	})

	it('applies a legend series and the selection together', () => {
		const { lit, mark } = chartMarkEmphasis(null, 1, noop, selected)

		expect([lit(0, 1), lit(1, 0), lit(1, 1)]).toEqual([false, false, true])

		expect(mark).toEqual({ series: 1, datum: null })
	})

	it('lights each mark with no selection', () => {
		const { lit } = chartMarkEmphasis(null, null, noop, null)

		expect([lit(0, 0), lit(3, 9)]).toEqual([true, true])
	})
})

describe('litOverlay', () => {
	const row = [{ d: 'M0' }, null, { d: 'M2' }, { d: 'M3' }]

	it('stands alone when each bar is lit', () => {
		expect(litOverlay(row, () => true)).toEqual({ dimmed: false, overlay: null })
	})

	it('dims the series and re-draws the lit bars over it', () => {
		expect(litOverlay(row, (datum) => datum !== 2)).toEqual({ dimmed: true, overlay: 'M0 M3' })
	})

	it('lifts a lone pointed bar, although each bar is lit', () => {
		expect(litOverlay([{ d: 'M0' }], () => true, true)).toEqual({ dimmed: true, overlay: 'M0' })
	})

	it('dims with no overlay when no bar is lit', () => {
		expect(litOverlay(row, () => false)).toEqual({ dimmed: true, overlay: null })
	})
})

describe('sliceGroupClass', () => {
	it('dims the slices outside the selection', () => {
		const selected = new Set([1])

		expect(sliceGroupClass(null, 0, selected)).toContain('opacity-25')

		expect(sliceGroupClass(null, 1, selected)).not.toContain('opacity-25')
	})

	it('holds the selection over a hover or legend emphasis', () => {
		expect(sliceGroupClass(0, 1, new Set([1]))).not.toContain('opacity-25')

		expect(sliceGroupClass(0, 0, new Set([1]))).toContain('opacity-25')
	})

	it('lets the emphasised slice light alone when nothing is selected', () => {
		expect(sliceGroupClass(0, 1, null)).toContain('opacity-25')

		expect(sliceGroupClass(0, 0, null)).not.toContain('opacity-25')
	})
})

describe('categorySlots', () => {
	it('keeps the slot of each category when a filter removes the others', () => {
		const all = categorySlots(['Tea', 'Coffee', 'Cocoa'], ['Tea', 'Coffee', 'Cocoa'])

		expect(categorySlots(['Coffee'], ['Tea', 'Coffee', 'Cocoa'])).toEqual([all[1]])
	})

	it('falls back to row position without a category list', () => {
		expect(categorySlots(['Coffee'], undefined)).toEqual(categorySlots(['Tea'], undefined))
	})

	it('gives a category outside the list a slot after the listed ones', () => {
		const [listed, unlisted] = categorySlots(['Tea', 'Mate'], ['Tea', 'Coffee'])

		expect(unlisted).not.toBe(listed)

		expect(unlisted).not.toBe(categorySlots(['Coffee'], ['Tea', 'Coffee'])[0])
	})
})
