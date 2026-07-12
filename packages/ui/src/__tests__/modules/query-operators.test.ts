import { describe, expect, it } from 'vitest'
import { getOperators } from '../../modules/query/engine/query-operators'
import type { QueryField } from '../../modules/query/engine/types'

const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

describe('getOperators', () => {
	it('returns the field’s explicit operators when present', () => {
		const custom: QueryField = {
			name: 'x',
			label: 'X',
			type: 'text',
			operators: [{ value: 'is', label: 'is' }],
		}

		expect(getOperators(custom)).toEqual([{ value: 'is', label: 'is' }])
	})

	it('falls back to the default operator list per field type', () => {
		expect(getOperators(numberField).map((o) => o.value)).toContain('gte')
	})

	it('offers a range between operator for numbers', () => {
		const between = getOperators(numberField).find((o) => o.value === 'between')

		expect(between?.range).toBe(true)
	})
})
