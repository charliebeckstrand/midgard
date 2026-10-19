import { describe, expectTypeOf, it } from 'vitest'
import type { JsonValue } from '../../components/json-tree'
import type { QueryGroup } from '../../modules/query/engine/types'

describe('serializeQuery', () => {
	it('types a query tree as a JSON value', () => {
		expectTypeOf<QueryGroup>().toExtend<JsonValue>()
	})
})
