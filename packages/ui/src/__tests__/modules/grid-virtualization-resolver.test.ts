import { describe, expect, it } from 'vitest'
import { resolveVirtualization } from '../../modules/grid/grid-data-resolvers'

describe('resolveVirtualization', () => {
	it('disables when virtualize is absent or false', () => {
		expect(resolveVirtualization(undefined, 'snug').enabled).toBe(false)

		expect(resolveVirtualization(false, 'snug').enabled).toBe(false)
	})

	it('scales the default row-height estimate with density', () => {
		expect(resolveVirtualization(true, 'compact').estimateSize).toBe(36)

		expect(resolveVirtualization(true, 'snug').estimateSize).toBe(44)

		expect(resolveVirtualization(true, 'loose').estimateSize).toBe(52)
	})

	it('falls back to the snug estimate when density is omitted', () => {
		expect(resolveVirtualization(true, undefined).estimateSize).toBe(44)
	})

	it('an explicit estimateSize overrides the density-scaled default', () => {
		expect(resolveVirtualization({ estimateSize: 64 }, 'compact').estimateSize).toBe(64)
	})

	it('defaults overscan to 10, overridable by the options object', () => {
		expect(resolveVirtualization(true, 'snug').overscan).toBe(10)

		expect(resolveVirtualization({ overscan: 5 }, 'snug').overscan).toBe(5)
	})
})
