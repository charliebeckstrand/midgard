import { describe, expect, it } from 'vitest'
import { noop } from '../../utilities/noop'

describe('noop', () => {
	it('returns undefined', () => {
		expect(noop()).toBeUndefined()
	})
})
