// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findBuiltInOperator, getOperators } from '../../modules/query/engine/query-operators'
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

describe('findBuiltInOperator', () => {
	it('finds an operator that one default set holds, with its value label', () => {
		expect(findBuiltInOperator('isEmpty')).toMatchObject({ label: 'is', valueLabel: 'Empty' })
	})

	it('takes the first match in the default sets, which is the text set', () => {
		expect(findBuiltInOperator('notEquals')?.label).toBe('does not equal')
	})

	it('finds no operator that no default set holds', () => {
		expect(findBuiltInOperator('custom')).toBeUndefined()
	})
})
