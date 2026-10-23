import { describe, expectTypeOf, it } from 'vitest'
import type { BadgeVariants } from '../../components/badge'
import type { BadgeRemovableProps } from '../../components/badge/badge-removable'

describe('BadgeRemovable', () => {
	it('takes each color of the Badge axis, the extended hues included', () => {
		expectTypeOf<BadgeRemovableProps['color']>().toEqualTypeOf<BadgeVariants['color']>()
	})
})
