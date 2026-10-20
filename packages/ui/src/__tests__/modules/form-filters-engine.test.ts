// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	countActiveFilters,
	filtersFormState,
	formatActiveFilters,
	isFilterActive,
	writeFilter,
} from '../../modules/form/engine/form-filters'
import { formFiltersAxis } from '../../modules/form/engine/form-filters-axis'
import { intlEn, intlEs } from '../../primitives/intl/intl-catalog'

describe('isFilterActive', () => {
	it.each([
		['undefined', undefined],
		['null', null],
		['an empty string', ''],
		['an empty array', []],
	])('reads %s as not set', (_label, value) => {
		expect(isFilterActive(value)).toBe(false)
	})

	it.each([
		['false', false],
		['zero', 0],
		['a string', 'a'],
		['an array with an item', ['a']],
	])('reads %s as set', (_label, value) => {
		expect(isFilterActive(value)).toBe(true)
	})
})

describe('writeFilter', () => {
	it('writes a set value', () => {
		expect(writeFilter({ q: 'a' }, 'status', 'open')).toEqual({ q: 'a', status: 'open' })
	})

	it('removes the key of a value that is not set', () => {
		expect(writeFilter({ q: 'a', status: 'open' }, 'status', '')).toEqual({ q: 'a' })
	})

	it('starts from an empty record', () => {
		expect(writeFilter(undefined, 'q', 'a')).toEqual({ q: 'a' })
	})

	it('does not change its argument', () => {
		const record = { q: 'a' }

		writeFilter(record, 'q', undefined)

		expect(record).toEqual({ q: 'a' })
	})
})

describe('countActiveFilters', () => {
	it('counts the slots that hold a set value', () => {
		expect(countActiveFilters({ q: 'a', status: undefined, tags: [], done: false })).toBe(2)
	})
})

describe('formatActiveFilters', () => {
	it('uses the singular for one filter', () => {
		expect(formatActiveFilters(intlEn, 1)).toBe('1 filter active')
	})

	it('uses the plural for another count', () => {
		expect(formatActiveFilters(intlEn, 0)).toBe('0 filters active')

		expect(formatActiveFilters(intlEn, 3)).toBe('3 filters active')

		expect(formatActiveFilters(intlEs, 1)).toBe('1 filtro activo')

		expect(formatActiveFilters(intlEs, 3)).toBe('3 filtros activos')
	})
})

describe('filtersFormState', () => {
	it('gives a valid and clean state over the record', () => {
		const record = { q: 'a' }

		expect(filtersFormState(record)).toEqual({
			values: record,
			errors: {},
			touchedFields: {},
			dirtyFields: {},
			dirty: false,
			valid: true,
			submitting: false,
		})
	})

	it('keeps the identity of the empty maps', () => {
		const first = filtersFormState({})

		const second = filtersFormState({ q: 'a' })

		expect(second.errors).toBe(first.errors)

		expect(second.touchedFields).toBe(first.touchedFields)
	})
})

describe('formFiltersAxis', () => {
	it('holds a rail on one row at every width', () => {
		expect(formFiltersAxis('rail')).toEqual({
			rail: true,
			direction: 'row',
			align: 'end',
			width: 'shrink-0',
		})
	})

	it('drops a stack to a column on a compact viewport', () => {
		const { rail, direction, align, width } = formFiltersAxis('stack')

		expect(rail).toBe(false)

		expect(width).toBe('w-full')

		expect(direction).toEqual({ initial: 'col', sm: 'row' })

		expect(align).toEqual({ initial: 'start', sm: 'end' })
	})
})
