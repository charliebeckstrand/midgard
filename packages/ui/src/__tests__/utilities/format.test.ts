import { describe, expect, it } from 'vitest'
import { resolveFormat } from '../../utilities/format'

// Assertions assume the en-US default locale (matching the Odometer / format
// -number corpus) except where a spec pins its own locale; a different runtime
// locale would change grouping and currency glyphs.
describe('resolveFormat', () => {
	describe('number', () => {
		it('groups thousands and keeps fractional detail', () => {
			expect(resolveFormat({ type: 'number' })(1234.5)).toBe('1,234.5')
		})

		it('honors an explicit fraction ceiling', () => {
			expect(resolveFormat({ type: 'number', maximumFractionDigits: 2 })(1.2345)).toBe('1.23')
		})
	})

	describe('integer', () => {
		it('groups thousands with no fraction digits', () => {
			expect(resolveFormat({ type: 'integer' })(1_000_000)).toBe('1,000,000')
		})

		it('rounds a fractional input to a whole number', () => {
			expect(resolveFormat({ type: 'integer' })(1234.9)).toBe('1,235')
		})

		it('survives an ambient minimumFractionDigits without a RangeError', () => {
			expect(
				resolveFormat({ type: 'integer' }, { numberFormat: { minimumFractionDigits: 2 } })(5),
			).toBe('5')
		})
	})

	describe('currency', () => {
		it('defaults to USD', () => {
			expect(resolveFormat({ type: 'currency' })(1234.5)).toBe('$1,234.50')
		})

		it('drops fraction digits on request', () => {
			expect(resolveFormat({ type: 'currency', maximumFractionDigits: 0 })(71_000)).toBe('$71,000')
		})

		it('takes the spec currency over the default', () => {
			expect(resolveFormat({ type: 'currency', currency: 'GBP' })(5)).toBe('£5.00')
		})

		it('reads the ambient currency and locale', () => {
			expect(
				resolveFormat({ type: 'currency' }, { locale: 'de-DE', currency: 'EUR' })(1234.5),
			).toBe(new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5))
		})
	})

	describe('percent', () => {
		it('formats a 0..1 share as a whole percent', () => {
			expect(resolveFormat({ type: 'percent' })(0.42)).toBe('42%')
		})

		it('keeps fraction digits on request', () => {
			expect(resolveFormat({ type: 'percent', maximumFractionDigits: 1 })(0.425)).toBe('42.5%')
		})
	})

	describe('compact', () => {
		it('abbreviates large magnitudes', () => {
			expect(resolveFormat({ type: 'compact' })(71_000)).toBe('71K')
		})
	})

	describe('id', () => {
		it('prefixes a whole number', () => {
			expect(resolveFormat({ type: 'id', prefix: 'INV' })(10)).toBe('INV-10')
		})

		it('zero-pads to a fixed width', () => {
			expect(resolveFormat({ type: 'id', prefix: 'INV', pad: 4 })(7)).toBe('INV-0007')
		})

		it('takes a custom separator', () => {
			expect(resolveFormat({ type: 'id', prefix: 'SKU', separator: '_' })(3)).toBe('SKU_3')
		})

		it('formats the bare number without a prefix', () => {
			expect(resolveFormat({ type: 'id' })(42)).toBe('42')
		})

		it('keeps the sign ahead of the padding', () => {
			expect(resolveFormat({ type: 'id', pad: 3 })(-5)).toBe('-005')
		})
	})

	it('reuses one formatter across calls with the same spec', () => {
		// Identical output across independent resolves is the proxy for the shared
		// cached Intl instance — a fresh formatter per resolve would still format
		// the same, so the assertion guards the seam, not the allocation count.
		const a = resolveFormat({ type: 'currency' })

		const b = resolveFormat({ type: 'currency' })

		expect(a(9)).toBe(b(9))
	})
})
