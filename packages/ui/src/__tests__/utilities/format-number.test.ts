// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { formatFraction, formatInteger, formatPercent } from '../../utilities/format-number'

// Assertions assume the en-US default locale, matching the existing Odometer
// corpus; a different runtime locale would change the grouping/decimal glyphs.
describe('formatInteger', () => {
	it('groups thousands', () => {
		expect(formatInteger(1234)).toBe('1,234')

		expect(formatInteger(1000000)).toBe('1,000,000')
	})

	it('formats zero and negatives', () => {
		expect(formatInteger(0)).toBe('0')

		expect(formatInteger(-1234)).toBe('-1,234')
	})

	// The bare `new Intl.NumberFormat()` keeps up to three fraction digits, so
	// despite its "no fraction digits" doc `formatInteger` does not round to an
	// integer.
	it('does not strip fraction digits (documents current behavior)', () => {
		expect(formatInteger(1.5)).toBe('1.5')
	})
})

describe('formatFraction', () => {
	it('keeps up to two fraction digits and groups thousands', () => {
		expect(formatFraction(1234.5)).toBe('1,234.5')
	})

	it('rounds to two fraction digits', () => {
		expect(formatFraction(1.2345)).toBe('1.23')

		expect(formatFraction(1.236)).toBe('1.24')
	})

	it('omits trailing fraction digits for whole numbers', () => {
		expect(formatFraction(2)).toBe('2')
	})
})

// The tables above hold the documented examples. The properties below read the
// same three functions over a generated domain, so a rounding or grouping break
// shrinks to the smallest number that shows it.
//
// The scale cap is 1e15, which is past any number a chart or a grid formats.
const SCALE = 1e15

/** A finite double in the band the properties read. */
const scaled = () => fc.double({ min: -SCALE, max: SCALE, noNaN: true })

/**
 * A band where the gap between neighboring doubles stays well under the
 * rounding error, so the round trip below measures the rounding alone.
 *
 * Above about 2.2e13 the gap passes 0.005. A value there reads back as the
 * neighboring double rather than itself, and the error is the gap, not the
 * rounding. The cap is 1e12, where the gap is about 0.00012.
 */
const ROUNDED = 1e12

/**
 * The number a formatted string states, read back through the en-US grouping.
 * It is an independent reader, so the properties never compare a format against
 * itself.
 */
function parseFormatted(text: string): number {
	return Number(text.replaceAll(',', '').replace('%', ''))
}

/** The integer part of a formatted number, sign and grouping intact. */
function integerPart(text: string): string {
	return text.split('.')[0] as string
}

/** Digits in groups of three, from an optional sign. */
const GROUPED = /^-?\d{1,3}(?:,\d{3})*$/

describe('formatInteger · properties', () => {
	test.prop([scaled()])('groups the integer part in threes', (value) => {
		expect(integerPart(formatInteger(value))).toMatch(GROUPED)
	})

	test.prop([fc.double({ min: 1e-6, max: SCALE, noNaN: true })])(
		'negates by a leading sign alone',
		(value) => {
			expect(formatInteger(-value)).toBe(`-${formatInteger(value)}`)
		},
	)
})

describe('formatFraction · properties', () => {
	test.prop([scaled()])('groups the integer part in threes', (value) => {
		expect(integerPart(formatFraction(value))).toMatch(GROUPED)
	})

	test.prop([scaled()])('keeps two fraction digits at most', (value) => {
		expect((formatFraction(value).split('.')[1] ?? '').length).toBeLessThanOrEqual(2)
	})

	// Half-expand rounding to two digits moves a value by half of the last digit
	// kept, and never by more. The slack absorbs float drift at the cap.
	test.prop([fc.double({ min: -ROUNDED, max: ROUNDED, noNaN: true })])(
		'states the value inside half of the digit it drops',
		(value) => {
			expect(Math.abs(parseFormatted(formatFraction(value)) - value)).toBeLessThanOrEqual(0.0050001)
		},
	)

	test.prop([scaled(), scaled()])('holds the order of two values', (a, b) => {
		const [low, high] = a <= b ? [a, b] : [b, a]

		expect(parseFormatted(formatFraction(low))).toBeLessThanOrEqual(
			parseFormatted(formatFraction(high)),
		)
	})
})

describe('formatPercent · properties', () => {
	// A share is a 0..1 fraction, so the band below covers the whole documented
	// domain and the over-100% readings a computed share reaches.
	const share = () => fc.double({ min: -10, max: 10, noNaN: true })

	test.prop([share()])('ends in a percent sign over a grouped integer', (value) => {
		const text = formatPercent(value)

		expect(text.endsWith('%')).toBe(true)

		expect(text.slice(0, -1)).toMatch(GROUPED)
	})

	test.prop([share()])('states the share times a hundred, rounded whole', (value) => {
		expect(Math.abs(parseFormatted(formatPercent(value)) - value * 100)).toBeLessThanOrEqual(
			0.5000001,
		)
	})
})
