import { describe, expect, it } from 'vitest'

import {
	type DatePickerRelativePreset,
	type DatePickerRelativeValue,
	DEFAULT_RELATIVE_PRESETS,
	isCustomActive,
	isRelativeEmpty,
	matchRelativePreset,
	relativeChips,
	resolveRelativePresets,
	selectedPresetIds,
	togglePresetValue,
} from '../../components/date-picker/date-picker-relative-utilities'
import {
	addDays,
	formatRange,
	startOfDay,
} from '../../components/date-picker/date-picker-utilities'

// A fixed reference instant keeps every preset deterministic: 2025-06-15.
const NOW = new Date(2025, 5, 15)

function preset(id: string): DatePickerRelativePreset {
	const found = DEFAULT_RELATIVE_PRESETS.find((option) => option.id === id)

	if (!found) throw new Error(`unknown preset ${id}`)

	return found
}

function resolve(id: string): DatePickerRelativeValue {
	return preset(id).resolve(NOW)
}

describe('DEFAULT_RELATIVE_PRESETS', () => {
	it('resolves day-granular spans inclusive of both endpoints', () => {
		expect(resolve('today')).toEqual({ from: new Date(2025, 5, 15), to: new Date(2025, 5, 15) })

		expect(resolve('yesterday')).toEqual({ from: new Date(2025, 5, 14), to: new Date(2025, 5, 14) })
	})

	it('counts "Last N days" inclusive of today', () => {
		expect(resolve('last-7-days')).toEqual({
			from: new Date(2025, 5, 9),
			to: new Date(2025, 5, 15),
		})

		expect(resolve('last-30-days')).toEqual({
			from: addDays(startOfDay(NOW), -29),
			to: new Date(2025, 5, 15),
		})

		expect(resolve('last-90-days')).toEqual({
			from: addDays(startOfDay(NOW), -89),
			to: new Date(2025, 5, 15),
		})
	})

	it('resolves month-to-date and the prior whole month', () => {
		expect(resolve('this-month')).toEqual({ from: new Date(2025, 5, 1), to: new Date(2025, 5, 15) })

		expect(resolve('last-month')).toEqual({ from: new Date(2025, 4, 1), to: new Date(2025, 4, 31) })
	})

	it('resolves year-to-date and the prior whole year', () => {
		expect(resolve('this-year')).toEqual({ from: new Date(2025, 0, 1), to: new Date(2025, 5, 15) })

		expect(resolve('last-year')).toEqual({ from: new Date(2024, 0, 1), to: new Date(2024, 11, 31) })
	})

	it('does not include "Last 14 days"', () => {
		expect(DEFAULT_RELATIVE_PRESETS.some((option) => option.id === 'last-14-days')).toBe(false)
	})
})

describe('resolveRelativePresets', () => {
	it('returns the built-in list for bare true', () => {
		expect(resolveRelativePresets(true)).toBe(DEFAULT_RELATIVE_PRESETS)
	})

	it('falls back to the built-in list for an empty config', () => {
		expect(resolveRelativePresets({})).toBe(DEFAULT_RELATIVE_PRESETS)
	})

	it('replaces the list wholesale when presets are supplied', () => {
		const custom: DatePickerRelativePreset[] = [
			{ id: 'x', label: 'X', resolve: (now) => ({ from: now, to: now }) },
		]

		expect(resolveRelativePresets({ presets: custom })).toBe(custom)
	})
})

describe('isRelativeEmpty', () => {
	it('is true for undefined and the empty array', () => {
		expect(isRelativeEmpty(undefined)).toBe(true)

		expect(isRelativeEmpty([])).toBe(true)
	})

	it('is false when any span is present', () => {
		expect(isRelativeEmpty([resolve('today')])).toBe(false)
	})
})

describe('togglePresetValue (single-select)', () => {
	const presets = DEFAULT_RELATIVE_PRESETS

	it('selects a preset as the sole value', () => {
		expect(togglePresetValue(undefined, preset('today'), presets, NOW, false)).toEqual([
			resolve('today'),
		])
	})

	it('replaces the current preset instead of adding', () => {
		expect(togglePresetValue([resolve('this-year')], preset('today'), presets, NOW, false)).toEqual(
			[resolve('today')],
		)
	})

	it('clears when the selected preset is re-picked', () => {
		expect(
			togglePresetValue([resolve('today')], preset('today'), presets, NOW, false),
		).toBeUndefined()
	})
})

describe('togglePresetValue (multi-select)', () => {
	const presets = DEFAULT_RELATIVE_PRESETS

	it('adds the first preset', () => {
		expect(togglePresetValue(undefined, preset('today'), presets, NOW, true)).toEqual([
			resolve('today'),
		])
	})

	it('keeps multiple presets in list order', () => {
		const afterFirst = togglePresetValue(undefined, preset('last-year'), presets, NOW, true)

		const afterSecond = togglePresetValue(afterFirst, preset('this-year'), presets, NOW, true)

		// 'this-year' precedes 'last-year' in the list, so it sorts first.
		expect(afterSecond).toEqual([resolve('this-year'), resolve('last-year')])
	})

	it('removes a selected preset', () => {
		const value = [resolve('this-year'), resolve('last-year')]

		expect(togglePresetValue(value, preset('this-year'), presets, NOW, true)).toEqual([
			resolve('last-year'),
		])
	})

	it('commits undefined when the last preset is toggled off', () => {
		expect(
			togglePresetValue([resolve('today')], preset('today'), presets, NOW, true),
		).toBeUndefined()
	})

	it('replaces an active custom range with a single preset', () => {
		const custom = [{ from: new Date(2025, 0, 3), to: new Date(2025, 0, 9) }]

		expect(togglePresetValue(custom, preset('today'), presets, NOW, true)).toEqual([
			resolve('today'),
		])
	})
})

describe('matchRelativePreset / selectedPresetIds / isCustomActive', () => {
	const presets = DEFAULT_RELATIVE_PRESETS

	it('matches a resolved span back to its preset', () => {
		expect(matchRelativePreset(resolve('this-month'), presets, NOW)?.id).toBe('this-month')
	})

	it('returns null and flags custom for an unmatched span', () => {
		const custom = { from: new Date(2025, 0, 3), to: new Date(2025, 0, 9) }

		expect(matchRelativePreset(custom, presets, NOW)).toBeNull()

		expect(isCustomActive([custom], presets, NOW)).toBe(true)
	})

	it('collects the ids of all matched spans', () => {
		const ids = selectedPresetIds([resolve('today'), resolve('last-year')], presets, NOW)

		expect([...ids].sort()).toEqual(['last-year', 'today'])

		expect(isCustomActive([resolve('today')], presets, NOW)).toBe(false)
	})
})

describe('relativeChips', () => {
	const presets = DEFAULT_RELATIVE_PRESETS

	it('returns no chips for an empty value', () => {
		expect(relativeChips(undefined, presets, NOW)).toEqual([])
	})

	it('labels matched spans by preset and custom spans by range', () => {
		const custom = { from: new Date(2025, 0, 3), to: new Date(2025, 0, 9) }

		expect(relativeChips([resolve('this-year'), custom], presets, NOW)).toEqual([
			{ key: 'preset-this-year', label: 'This year' },
			{ key: 'custom-1', label: formatRange(custom.from, custom.to) },
		])
	})
})

describe('matchRelativePreset with an explicit pick (span collisions)', () => {
	// On 1 January, "Today", "This month", and "This year" all resolve to the same
	// single-day span — the ambiguity where a bare range match would label a selection
	// by the wrong preset. The real Ship Date cases are "Last 6 months" ≡ "This year"
	// on 1 July and "This month" ≡ "This quarter" in a quarter's first month.
	const NEW_YEAR = new Date(2025, 0, 1)
	const presets = DEFAULT_RELATIVE_PRESETS
	const span = preset('this-year').resolve(NEW_YEAR)

	it('confirms the presets collide on 1 January', () => {
		expect(preset('today').resolve(NEW_YEAR)).toEqual(span)

		expect(preset('this-month').resolve(NEW_YEAR)).toEqual(span)
	})

	it('falls back to the first list match with no pick', () => {
		expect(matchRelativePreset(span, presets, NEW_YEAR)?.id).toBe('today')
	})

	it('prefers a picked preset that still resolves to the span', () => {
		expect(matchRelativePreset(span, presets, NEW_YEAR, new Set(['this-year']))?.id).toBe(
			'this-year',
		)

		expect(matchRelativePreset(span, presets, NEW_YEAR, new Set(['this-month']))?.id).toBe(
			'this-month',
		)
	})

	it('prefers the most recently picked id among colliding presets', () => {
		// Set insertion order = click order; the newest pick that still resolves to the
		// span wins, not the earliest in the preset list.
		expect(matchRelativePreset(span, presets, NEW_YEAR, new Set(['today', 'this-year']))?.id).toBe(
			'this-year',
		)

		expect(matchRelativePreset(span, presets, NEW_YEAR, new Set(['this-year', 'today']))?.id).toBe(
			'today',
		)
	})

	it('ignores a stale pick that no longer matches the span', () => {
		expect(matchRelativePreset(span, presets, NEW_YEAR, new Set(['yesterday']))?.id).toBe('today')
	})

	it('drives selectedPresetIds and relativeChips by the pick', () => {
		expect(selectedPresetIds([span], presets, NEW_YEAR, new Set(['this-year']))).toEqual(
			new Set(['this-year']),
		)

		expect(relativeChips([span], presets, NEW_YEAR, new Set(['this-year']))).toEqual([
			{ key: 'preset-this-year', label: 'This year' },
		])
	})

	it('toggles off the picked preset instead of re-selecting its twin', () => {
		expect(
			togglePresetValue(
				[span],
				preset('this-year'),
				presets,
				NEW_YEAR,
				false,
				new Set(['this-year']),
			),
		).toBeUndefined()

		// Without the pick, single-select reads 'today' as active and re-commits the span.
		expect(togglePresetValue([span], preset('this-year'), presets, NEW_YEAR, false)).toEqual([span])
	})
})
