import { describe, expectTypeOf, it } from 'vitest'
import type { BoxOutline } from '../../structure/box'

describe('Box', () => {
	it('takes `true` for the default outline, with no second name for it', () => {
		expectTypeOf<BoxOutline>().toEqualTypeOf<boolean | 'subtle' | 'strong'>()
	})
})
