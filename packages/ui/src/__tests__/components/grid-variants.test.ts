import { describe, expect, it } from 'vitest'
import {
	resolveColStart,
	resolveCols,
	resolveGap,
	resolveRowSpan,
	resolveRowStart,
	resolveRows,
	resolveSpan,
} from '../../components/grid/variants'

describe('resolveCols', () => {
	it('returns empty when value is undefined', () => {
		const result = resolveCols(undefined)

		expect(result.classes).toEqual([])

		expect(result.style).toEqual({})
	})

	it('emits a class + style for a scalar value', () => {
		const result = resolveCols(3)

		expect(result.classes.length).toBeGreaterThan(0)

		expect(result.style).toMatchObject({ '--cols': 3 })
	})

	it('emits per-breakpoint classes for a responsive value', () => {
		const result = resolveCols({ initial: 1, sm: 2, md: 3 })

		expect(result.classes.length).toBe(3)

		expect(result.style).toMatchObject({
			'--cols': 1,
			'--cols-sm': 2,
			'--cols-md': 3,
		})
	})
})

describe('resolveRows', () => {
	it('returns empty when value is undefined', () => {
		expect(resolveRows(undefined).classes).toEqual([])
	})

	it('emits a class + style for a scalar value', () => {
		const result = resolveRows(2)

		expect(result.style).toMatchObject({ '--rows': 2 })
	})
})

describe('resolveGap', () => {
	it('returns an empty array when value is undefined', () => {
		expect(resolveGap(undefined)).toEqual([])
	})

	it('returns a single class for a scalar gap', () => {
		const result = resolveGap('md')

		expect(result.length).toBe(1)
	})

	it('emits breakpoint-prefixed classes for responsive values', () => {
		const result = resolveGap({ initial: 'sm', md: 'lg' })

		expect(result.length).toBe(2)

		expect(result.some((c) => c.startsWith('md:'))).toBe(true)
	})
})

describe('resolveRowSpan, resolveColStart, resolveRowStart', () => {
	it('all return empty when value is undefined', () => {
		expect(resolveRowSpan(undefined).classes).toEqual([])

		expect(resolveColStart(undefined).classes).toEqual([])

		expect(resolveRowStart(undefined).classes).toEqual([])
	})

	it('all emit a single-class result for a scalar value', () => {
		expect(resolveRowSpan(2).classes.length).toBe(1)

		expect(resolveColStart(3).classes.length).toBe(1)

		expect(resolveRowStart(4).classes.length).toBe(1)
	})
})

describe('resolveSpan', () => {
	it('returns empty when value is undefined', () => {
		expect(resolveSpan(undefined, undefined).classes).toEqual([])
	})

	it('returns the full-span class when value is "full" and no parent columns are set', () => {
		const result = resolveSpan('full', undefined)

		expect(result.classes.length).toBe(1)

		expect(result.style).toEqual({})
	})

	it('mirrors the parent column count when value is "full" and columns is set', () => {
		const result = resolveSpan('full', 4)

		expect(result.style).toMatchObject({ '--span': 4 })
	})

	it('handles a responsive value with a mix of numbers and "full"', () => {
		const result = resolveSpan({ initial: 2, sm: 'full', md: 3 }, undefined)

		expect(result.classes.length).toBe(3)

		expect(result.style).toMatchObject({ '--span': 2, '--span-md': 3 })
	})

	it('handles a scalar numeric value', () => {
		const result = resolveSpan(2, undefined)

		expect(result.style).toMatchObject({ '--span': 2 })
	})
})
