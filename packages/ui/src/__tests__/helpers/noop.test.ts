import { describe, expect, it } from 'vitest'
import { noop } from '../../helpers/noop'

describe('noop', () => {
	it('returns undefined', () => {
		expect(noop()).toBeUndefined()
	})
})
