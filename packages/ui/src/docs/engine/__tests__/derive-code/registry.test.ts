import { describe, expect, it } from 'vitest'
import { defaultRegistry } from '../../derive-code/registry'

describe('defaultRegistry.byType', () => {
	it('reads __name / __module off a tagged function', () => {
		const Component = Object.assign(() => null, { __name: 'Button', __module: 'button' })

		expect(defaultRegistry.byType.get(Component)).toEqual({ name: 'Button', module: 'button' })
	})

	it('returns undefined for an untagged function', () => {
		const Plain = (() => null) as unknown

		expect(defaultRegistry.byType.get(Plain)).toBeUndefined()
	})

	it('returns undefined when only one of the two tags is present', () => {
		const Partial = Object.assign(() => null, { __name: 'Button' })

		expect(defaultRegistry.byType.get(Partial)).toBeUndefined()
	})

	it('returns undefined for null / undefined', () => {
		expect(defaultRegistry.byType.get(null)).toBeUndefined()

		expect(defaultRegistry.byType.get(undefined)).toBeUndefined()
	})

	it('returns undefined when tags are present but not strings', () => {
		const Bad = Object.assign(() => null, { __name: 42, __module: {} })

		expect(defaultRegistry.byType.get(Bad)).toBeUndefined()
	})
})
