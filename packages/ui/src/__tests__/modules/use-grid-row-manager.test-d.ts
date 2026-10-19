import { describe, expectTypeOf, it } from 'vitest'
import type { GridRowManagerGroup } from '../../modules/grid/grid-row-group-types'
import type { GridRowManagerProps } from '../../modules/grid/grid-row-manager'

describe('GridRowManagerGroup', () => {
	it('is the public element type of GridRowManagerProps.groups', () => {
		expectTypeOf<GridRowManagerProps['groups']>().toEqualTypeOf<GridRowManagerGroup[]>()
	})
})
