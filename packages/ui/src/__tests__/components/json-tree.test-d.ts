import { describe, expectTypeOf, it } from 'vitest'
import type { JsonTreeProps, JsonTreeVirtualize } from '../../components/json-tree'

describe('JsonTree', () => {
	it('exports the type of its virtualize prop', () => {
		expectTypeOf<JsonTreeProps['virtualize']>().toEqualTypeOf<JsonTreeVirtualize | undefined>()
	})
})
