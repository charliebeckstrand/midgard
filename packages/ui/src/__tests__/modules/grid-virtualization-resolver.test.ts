// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveVirtualization } from '../../modules/grid/grid-data-resolvers'

describe('resolveVirtualization', () => {
	it('disables when virtualize is absent or false', () => {
		expect(resolveVirtualization(undefined).enabled).toBe(false)

		expect(resolveVirtualization(false).enabled).toBe(false)
	})

	/** The grid measures its row height when the consumer gives none (see `useGridRowHeight`). */
	it('leaves the row-height estimate to the measurement by default', () => {
		expect(resolveVirtualization(true).estimateSize).toBeUndefined()
	})

	it('keeps an explicit estimateSize', () => {
		expect(resolveVirtualization({ estimateSize: 64 }).estimateSize).toBe(64)
	})

	it('defaults overscan to 10, overridable by the options object', () => {
		expect(resolveVirtualization(true).overscan).toBe(10)

		expect(resolveVirtualization({ overscan: 5 }).overscan).toBe(5)
	})
})
