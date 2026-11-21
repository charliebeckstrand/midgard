// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	KNOWN_OPERATORS,
	RANGE_OPERATORS,
	SET_OPERATORS,
	VALUELESS_OPERATORS,
} from '../../modules/query/engine/query-evaluate'
import {
	findBuiltInOperator,
	getOperators,
	setOperators,
} from '../../modules/query/engine/query-operators'
import type { QueryField, QueryFieldType } from '../../modules/query/engine/types'

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

	it('takes the default set of the given type before the other sets', () => {
		expect(findBuiltInOperator('equals', 'date')?.label).toBe('on')

		expect(findBuiltInOperator('equals', 'select')?.label).toBe('is')

		expect(findBuiltInOperator('notEquals', 'number')?.label).toBe('≠')
	})

	it('takes the first match in the other sets when the set of the type does not hold it', () => {
		expect(findBuiltInOperator('isEmpty', 'number')).toMatchObject({
			label: 'is',
			valueLabel: 'Empty',
		})
	})

	it('finds a set operator, which no field type offers by default', () => {
		expect(findBuiltInOperator('in', 'select')).toMatchObject({ label: 'is any of', set: true })

		expect(findBuiltInOperator('notIn')).toMatchObject({ label: 'is none of', set: true })

		expect(getOperators({ name: 's', label: 'S', type: 'select' }).map((op) => op.value)).toEqual([
			'equals',
			'notEquals',
		])
	})

	it('finds no operator that no default set holds', () => {
		expect(findBuiltInOperator('custom')).toBeUndefined()
	})
})

// Each operator that the evaluator applies has a built-in label. So the summary
// never shows the raw name of an operator that constrains the rows.
describe('the built-in operator sets and the evaluator', () => {
	// The compiler rejects this record when a field type has no entry.
	const types = {
		text: true,
		number: true,
		date: true,
		select: true,
		boolean: true,
	} satisfies Record<QueryFieldType, true>

	const operators = [
		...(Object.keys(types) as QueryFieldType[]).flatMap((type) =>
			getOperators({ name: type, label: type, type }),
		),
		...setOperators,
	]

	const builtIn = new Set(operators.map((operator) => operator.value))

	it('define each operator that the evaluator knows', () => {
		expect([...KNOWN_OPERATORS].filter((value) => !builtIn.has(value))).toEqual([])
	})

	it('hold only operators that the evaluator knows', () => {
		expect([...builtIn].filter((value) => !KNOWN_OPERATORS.has(value))).toEqual([])
	})

	// The builder reads the flag, and the evaluator reads the set. A built-in with
	// a wrong flag gets an editor of one shape and a judgment of another.
	it.each([
		['noValue', VALUELESS_OPERATORS],
		['range', RANGE_OPERATORS],
		['set', SET_OPERATORS],
	] as const)('carry the %s flag exactly when the evaluator set holds the name', (flag, names) => {
		const mismatched = operators
			.filter((operator) => Boolean(operator[flag]) !== names.has(operator.value))
			.map((operator) => operator.value)

		expect(mismatched).toEqual([])
	})
})
