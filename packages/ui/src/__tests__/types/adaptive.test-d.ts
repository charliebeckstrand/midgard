import { describe, expectTypeOf, it } from 'vitest'
import { adaptive } from '../../types/responsive'

describe('adaptive', () => {
	it('keeps each literal in the type, so a reader of the type sees the map', () => {
		const value = adaptive({ compact: 'bottom', medium: 'center' })

		expectTypeOf(value).toEqualTypeOf<{ readonly initial: 'bottom'; readonly sm: 'center' }>()
	})
})
