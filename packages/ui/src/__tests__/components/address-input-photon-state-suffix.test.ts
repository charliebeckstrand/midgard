// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { splitUsState } from '../../components/address-input/address-input-photon-query'

describe('splitUsState with a street suffix or a directional', () => {
	it('keeps a suffix code after a house number as text', () => {
		expect(splitUsState('12 OAK CT')).toBeNull()

		expect(splitUsState('40 Ocean KY')).toBeNull()

		expect(splitUsState('7 Pine MT')).toBeNull()

		expect(splitUsState('9 Elk PR')).toBeNull()
	})

	it('keeps a directional code after a house number as text', () => {
		expect(splitUsState('5 Main St NE')).toBeNull()
	})

	it('reads a suffix or directional code as a state where no house number leads', () => {
		expect(splitUsState('Hartford CT')).toEqual({
			rest: 'Hartford',
			state: { code: 'CT', name: 'Connecticut' },
		})

		expect(splitUsState('Lincoln NE')?.state.code).toBe('NE')
	})

	it('reads a code that is not a suffix as a state after a house number', () => {
		expect(splitUsState('Portland OR')?.state.code).toBe('OR')

		expect(splitUsState('12 Main St OR')?.state.code).toBe('OR')
	})

	it('reads a full state name after a house number', () => {
		expect(splitUsState('12 Oak Connecticut')?.state.code).toBe('CT')
	})
})
