import { describe, expect, it } from 'vitest'

import {
	type ColorInput,
	contrastFloor,
	contrastRatio,
	meetsContrast,
	parseColor,
	readableInk,
	relativeLuminance,
	WCAG_AA_LARGE,
	WCAG_AA_TEXT,
	WCAG_AAA_LARGE,
	WCAG_AAA_TEXT,
	WCAG_NON_TEXT,
} from '../../utilities/contrast'

describe('parseColor', () => {
	it('reads the white / black keywords', () => {
		expect(parseColor('white')).toEqual([1, 1, 1])
		expect(parseColor('black')).toEqual([0, 0, 0])
	})

	it('reads 3- and 6-digit hex, ignoring case and whitespace', () => {
		expect(parseColor('#fff')).toEqual([1, 1, 1])
		expect(parseColor('  #FFFFFF ')).toEqual([1, 1, 1])
		expect(parseColor('#f00')).toEqual([1, 0, 0])
	})

	it('drops the hex alpha channel', () => {
		expect(parseColor('#ff000080')).toEqual(parseColor('#ff0000'))
	})

	it('reads rgb() with 0–255 or percentage channels, comma- or space-separated', () => {
		expect(parseColor('rgb(255, 0, 0)')).toEqual([1, 0, 0])
		expect(parseColor('rgb(255 0 0)')).toEqual([1, 0, 0])
		expect(parseColor('rgb(100% 0% 0%)')).toEqual([1, 0, 0])
	})

	it('drops the rgb() alpha channel', () => {
		expect(parseColor('rgba(255 0 0 / 0.5)')).toEqual(parseColor('rgb(255 0 0)'))
	})

	it('reads oklch() lightness as a fraction or a percentage', () => {
		const black: ColorInput = 'oklch(0% 0 0)'
		const white: ColorInput = 'oklch(1 0 0)'

		expect(relativeLuminance(black)).toBeCloseTo(0, 5)
		expect(relativeLuminance(white)).toBeCloseTo(1, 5)
	})

	it('clamps an Srgb triple into range and passes it through', () => {
		expect(parseColor([0.5, 0.25, 0.75])).toEqual([0.5, 0.25, 0.75])
		expect(parseColor([2, -1, 0.5])).toEqual([1, 0, 0.5])
	})

	it('throws on an unparseable string', () => {
		expect(() => parseColor('not-a-colour')).toThrow(/unparseable/)
	})
})

describe('relativeLuminance', () => {
	it('is 1 for white and 0 for black', () => {
		expect(relativeLuminance('white')).toBeCloseTo(1, 5)
		expect(relativeLuminance('black')).toBeCloseTo(0, 5)
	})
})

describe('contrastRatio', () => {
	it('is 21:1 for black on white', () => {
		expect(contrastRatio('white', 'black')).toBeCloseTo(21, 5)
	})

	it('is 1:1 for a colour against itself', () => {
		expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
	})

	it('is order-independent', () => {
		expect(contrastRatio('white', '#767676')).toBeCloseTo(contrastRatio('#767676', 'white'), 10)
	})

	it('reproduces the WebAIM reference ratio for #777 on white', () => {
		// #777777 on #ffffff is the canonical ~4.48:1 example.
		expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
	})
})

describe('meetsContrast', () => {
	it('defaults to the text AA floor', () => {
		expect(meetsContrast('white', 'black')).toBe(true)
		expect(meetsContrast('#777777', 'white')).toBe(false) // 4.48 < 4.5
	})

	it('honours an explicit numeric threshold', () => {
		expect(meetsContrast('#777777', 'white', WCAG_AA_LARGE)).toBe(true) // 4.48 >= 3
		expect(meetsContrast('white', 'black', WCAG_AAA_TEXT)).toBe(true) // 21 >= 7
	})

	it('honours a named WCAG level', () => {
		expect(meetsContrast('#777777', 'white', 'AA')).toBe(false) // 4.48 < 4.5
		expect(meetsContrast('#777777', 'white', 'non-text')).toBe(true) // 4.48 >= 3
		expect(meetsContrast('white', 'black', 'AAA')).toBe(true) // 21 >= 7
	})
})

describe('contrastFloor', () => {
	it('maps each named level to its WCAG ratio', () => {
		expect(contrastFloor('AA')).toBe(WCAG_AA_TEXT)
		expect(contrastFloor('AA-large')).toBe(WCAG_AA_LARGE)
		expect(contrastFloor('AAA')).toBe(WCAG_AAA_TEXT)
		expect(contrastFloor('AAA-large')).toBe(WCAG_AAA_LARGE)
		expect(contrastFloor('non-text')).toBe(WCAG_NON_TEXT)
	})

	it('passes a raw ratio through unchanged', () => {
		expect(contrastFloor(4.2)).toBe(4.2)
	})
})

describe('readableInk', () => {
	it('returns the leading candidate when it clears the floor', () => {
		// On near-black, white leads the list and clears (18.9:1), so it wins outright.
		expect(readableInk('#111111', ['white', 'black'])).toBe('white')
	})

	it('skips a candidate that fails and takes the next that clears', () => {
		// On mid-grey white fails (3.95:1) but black clears (5.32:1) — white-first, black wins.
		expect(readableInk('#808080', ['white', 'black'])).toBe('black')
	})

	it('falls back to the highest-contrast candidate when none clears', () => {
		// Neither clears AAA (7:1) on mid-grey; black (5.32 vs white 3.95) is the fallback.
		expect(readableInk('#808080', ['white', 'black'], WCAG_AAA_TEXT)).toBe('black')
	})

	it('respects a numeric threshold argument', () => {
		// At the non-text floor (3:1) white already clears on the same grey, so it stays first.
		expect(readableInk('#808080', ['white', 'black'], WCAG_NON_TEXT)).toBe('white')
	})

	it('accepts a named WCAG level', () => {
		// 'non-text' (3:1) keeps white first; 'AA' (4.5:1) fails white and flips to black.
		expect(readableInk('#808080', ['white', 'black'], 'non-text')).toBe('white')
		expect(readableInk('#808080', ['white', 'black'], 'AA')).toBe('black')
	})

	it('throws on an empty candidate list', () => {
		expect(() => readableInk('white', [])).toThrow(/at least one/)
	})
})

describe('WCAG thresholds', () => {
	it('carry their standard ratios', () => {
		expect(WCAG_AA_TEXT).toBe(4.5)
		expect(WCAG_AA_LARGE).toBe(3)
		expect(WCAG_NON_TEXT).toBe(3)
		expect(WCAG_AAA_TEXT).toBe(7)
		expect(WCAG_AAA_LARGE).toBe(4.5)
	})
})
