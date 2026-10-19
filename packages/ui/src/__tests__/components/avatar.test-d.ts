import { describe, expectTypeOf, it } from 'vitest'
import type { AvatarProps } from '../../components/avatar'
import type { Color } from '../../recipes'

describe('Avatar', () => {
	it('takes a palette color, not any string', () => {
		expectTypeOf<AvatarProps['color']>().toEqualTypeOf<Color | undefined>()
	})
})
