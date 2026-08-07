import { describe, expect, it } from 'vitest'
import { parseAspectRatio } from '../../utilities/aspect-ratio'

describe('parseAspectRatio', () => {
	it('divides a "w/h" string into its numeric ratio', () => {
		expect(parseAspectRatio('16/9')).toBeCloseTo(16 / 9)

		expect(parseAspectRatio('1/1')).toBe(1)
	})

	it('passes a positive number through', () => {
		expect(parseAspectRatio(2)).toBe(2)
	})

	it('returns null when the ratio is off', () => {
		expect(parseAspectRatio(false)).toBeNull()
	})

	it('rejects a non-positive number', () => {
		expect(parseAspectRatio(0)).toBeNull()

		expect(parseAspectRatio(-4 / 3)).toBeNull()

		expect(parseAspectRatio(Number.NaN)).toBeNull()
	})

	// The `${number}/${number}` type admits a sign on either term, so these are
	// well-typed prop values. A negative ratio is an invalid CSS `aspect-ratio`
	// and a negative `viewBox` height, so it must fall through the same way its
	// numeric twin does rather than reach the frame.
	it('rejects a signed "w/h" string on either term', () => {
		expect(parseAspectRatio('-4/3')).toBeNull()

		expect(parseAspectRatio('4/-3')).toBeNull()

		expect(parseAspectRatio('-4/-3')).toBeNull()
	})

	it('rejects a zero term on either side', () => {
		expect(parseAspectRatio('0/9')).toBeNull()

		expect(parseAspectRatio('16/0')).toBeNull()
	})

	// Runtime input from a JavaScript caller the type never checked.
	it('rejects an unparseable string', () => {
		expect(parseAspectRatio('wide' as `${number}/${number}`)).toBeNull()

		expect(parseAspectRatio('16' as `${number}/${number}`)).toBeNull()
	})
})
