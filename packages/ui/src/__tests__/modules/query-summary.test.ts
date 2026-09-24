// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import {
	formatQuerySummary,
	type QuerySummaryToken,
	summarizeQuery,
} from '../../modules/query/engine/query-summary'
import type { QueryField, QueryNode } from '../../modules/query/engine/types'

const nameField: QueryField = { name: 'name', label: 'Name', type: 'text' }

const ageField: QueryField = { name: 'age', label: 'Age', type: 'number' }

const statusField: QueryField = {
	name: 'status',
	label: 'Status',
	type: 'select',
	options: [
		{ value: 'active', label: 'Active' },
		{ value: 'pending', label: 'Pending' },
	],
}

const joinedField: QueryField = { name: 'joined', label: 'Joined', type: 'date' }

const verifiedField: QueryField = { name: 'verified', label: 'Verified', type: 'boolean' }

const fields = [nameField, ageField, statusField, joinedField, verifiedField]

const rule = (field: QueryField, patch: Partial<ReturnType<typeof createRule>>) => ({
	...createRule(field),
	...patch,
})

/** Summarizes an `and`-rooted group of `children` to its rendered line. */
const line = (children: QueryNode[]) => formatQuerySummary(createGroup('and', children), fields)

/** Summarizes an `and`-rooted group of `children` to its token stream. */
const stream = (children: QueryNode[]) => summarizeQuery(createGroup('and', children), fields)

describe('formatQuerySummary', () => {
	it('is empty for a query with no rules', () => {
		expect(line([])).toBe('')
	})

	it('is empty when every rule is blank', () => {
		expect(
			line([
				rule(nameField, { operator: 'contains', value: '' }),
				rule(ageField, { operator: 'gt', value: '' }),
			]),
		).toBe('')
	})

	it('renders a text rule as field, operator, and value', () => {
		expect(line([rule(nameField, { operator: 'contains', value: 'lee' })])).toBe(
			'Name contains lee',
		)
	})

	it('resolves a select value to its option label', () => {
		expect(line([rule(statusField, { operator: 'equals', value: 'active' })])).toBe(
			'Status is Active',
		)
	})

	it('falls back to the raw value when a select option is unknown', () => {
		expect(line([rule(statusField, { operator: 'equals', value: 'gone' })])).toBe('Status is gone')
	})

	it('omits the value for a value-less operator', () => {
		expect(line([createRule(verifiedField)])).toBe('Verified is true')
	})

	it('renders a value-less operator’s fixed value label', () => {
		expect(line([rule(nameField, { operator: 'isEmpty', value: '' })])).toBe('Name is Empty')

		expect(line([rule(nameField, { operator: 'isNotEmpty', value: '' })])).toBe('Name is not Empty')
	})

	it('renders a number operator by its symbol', () => {
		expect(line([rule(ageField, { operator: 'gt', value: 30 })])).toBe('Age > 30')
	})

	it('renders a two-bound range', () => {
		expect(line([rule(ageField, { operator: 'between', value: [10, 20] })])).toBe(
			'Age between 10 and 20',
		)
	})

	it('renders a lower-bound-only range as ≥', () => {
		expect(line([rule(ageField, { operator: 'between', value: [18, ''] })])).toBe('Age ≥ 18')
	})

	it('renders an upper-bound-only range as ≤', () => {
		expect(line([rule(ageField, { operator: 'between', value: ['', 65] })])).toBe('Age ≤ 65')
	})

	it('renders a whitespace-only bound as open, as the evaluator reads it', () => {
		expect(line([rule(ageField, { operator: 'between', value: ['  ', 65] })])).toBe('Age ≤ 65')
	})

	it('drops a scalar operator whose value is an array, along with its combinator', () => {
		// The evaluator reads such a value as no constraint.
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				rule(ageField, { operator: 'gt', value: [1, 2], combinator: 'or' }),
			]),
		).toBe('Name contains lee')
	})

	it('drops a range with a bound that is not a scalar, along with its combinator', () => {
		// The evaluator reads such a value as no constraint.
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				rule(ageField, { operator: 'between', value: [[10], 20], combinator: 'or' }),
			]),
		).toBe('Name contains lee')
	})

	it('drops a range that is not a pair, along with its combinator', () => {
		// The evaluator reads such a value as no constraint.
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				rule(ageField, { operator: 'between', value: [10], combinator: 'or' }),
			]),
		).toBe('Name contains lee')
	})

	it('drops a range whose value is not an array, along with its combinator', () => {
		// The evaluator reads such a value as no constraint.
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				rule(ageField, { operator: 'between', value: 5, combinator: 'or' }),
			]),
		).toBe('Name contains lee')
	})

	it('renders a date value verbatim', () => {
		expect(line([rule(joinedField, { operator: 'before', value: '2026-01-01' })])).toBe(
			'Joined before 2026-01-01',
		)
	})

	it('joins active rules by the later rule’s combinator', () => {
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				rule(ageField, { operator: 'gt', value: 30, combinator: 'or' }),
			]),
		).toBe('Name contains lee OR Age > 30')
	})

	it('drops a blank middle rule along with its combinator', () => {
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				rule(ageField, { operator: 'gt', value: '', combinator: 'or' }),
				rule(statusField, { operator: 'equals', value: 'pending', combinator: 'and' }),
			]),
		).toBe('Name contains lee AND Status is Pending')
	})

	it('brackets a nested group and joins it by its own combinator', () => {
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				createGroup('or', [
					rule(ageField, { operator: 'gt', value: 30 }),
					rule(statusField, { operator: 'equals', value: 'pending', combinator: 'or' }),
				]),
			]),
		).toBe('Name contains lee OR (Age > 30 OR Status is Pending)')
	})

	it('drops a nested group with no active rules', () => {
		expect(
			line([
				rule(nameField, { operator: 'contains', value: 'lee' }),
				createGroup('and', [rule(ageField, { operator: 'gt', value: '' })]),
			]),
		).toBe('Name contains lee')
	})

	it('renders an unresolved field and operator verbatim', () => {
		expect(line([rule(nameField, { field: 'gone', operator: 'contains', value: 'x' })])).toBe(
			'gone contains x',
		)
	})

	it('renders a value-less operator that the field does not offer, verbatim', () => {
		// The evaluator applies `isEmpty` to any field, so the rule is active.
		expect(line([rule(verifiedField, { operator: 'isEmpty', value: undefined })])).toBe(
			'Verified isEmpty',
		)
	})

	it('renders a range on an unknown field as a range', () => {
		expect(line([rule(ageField, { field: 'gone', operator: 'between', value: [10, 20] })])).toBe(
			'gone between 10 and 20',
		)

		expect(line([rule(ageField, { field: 'gone', operator: 'between', value: [10, ''] })])).toBe(
			'gone ≥ 10',
		)
	})

	it('renders between as a range when the field set does not flag it as one', () => {
		const scoreField: QueryField = {
			name: 'score',
			label: 'Score',
			type: 'number',
			operators: [{ value: 'between', label: 'in' }],
		}

		const group = createGroup('and', [rule(scoreField, { operator: 'between', value: [1, 2] })])

		expect(formatQuerySummary(group, [scoreField])).toBe('Score in 1 and 2')
	})

	it('renders a scalar operator as a scalar when the field set flags it as a range', () => {
		// The evaluator reads `gt` as a scalar comparison, whatever the flag says.
		const scoreField: QueryField = {
			name: 'score',
			label: 'Score',
			type: 'number',
			operators: [{ value: 'gt', label: 'more than', range: true }],
		}

		const group = createGroup('and', [rule(scoreField, { operator: 'gt', value: 5 })])

		expect(formatQuerySummary(group, [scoreField])).toBe('Score more than 5')
	})

	it('drops a rule whose operator the evaluator does not know', () => {
		expect(line([rule(nameField, { operator: 'custom', value: 'x' })])).toBe('')
	})

	it('drops an operator that the field offers but the evaluator does not know', () => {
		const codeField: QueryField = {
			name: 'code',
			label: 'Code',
			type: 'text',
			operators: [{ value: 'matches', label: 'matches' }],
		}

		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: 'lee' }),
			rule(codeField, { operator: 'matches', value: '^a', combinator: 'or' }),
		])

		expect(formatQuerySummary(group, [...fields, codeField])).toBe('Name contains lee')
	})
})

describe('summarizeQuery', () => {
	it('returns an empty stream for an inactive query', () => {
		expect(stream([])).toEqual([])
	})

	it('returns one rule token carrying the resolved parts', () => {
		const status = rule(statusField, { operator: 'equals', value: 'active' })

		expect(stream([status])).toEqual<QuerySummaryToken[]>([
			{ kind: 'rule', id: status.id, field: 'Status', operator: 'is', value: 'Active' },
		])
	})

	it('omits the value key for a value-less operator naming no value label', () => {
		const verified = createRule(verifiedField)

		const [token] = stream([verified])

		expect(token).toEqual({ kind: 'rule', id: verified.id, field: 'Verified', operator: 'is true' })
	})

	it('carries a value-less operator’s value label as the token value', () => {
		const [token] = stream([rule(nameField, { operator: 'isEmpty', value: '' })])

		expect(token).toMatchObject({ kind: 'rule', field: 'Name', operator: 'is', value: 'Empty' })
	})

	it('resolves the combinator to its AND/OR label, and names the node that holds it', () => {
		const age = rule(ageField, { operator: 'gt', value: 30, combinator: 'or' })

		const tokens = stream([rule(nameField, { operator: 'contains', value: 'lee' }), age])

		expect(tokens[1]).toEqual({ kind: 'combinator', id: age.id, combinator: 'or', label: 'OR' })
	})

	it('names the next active node in a combinator token, past an inactive one', () => {
		const age = rule(ageField, { operator: 'gt', value: 30, combinator: 'and' })

		const tokens = stream([
			rule(nameField, { operator: 'contains', value: 'lee' }),
			rule(nameField, { operator: 'contains', value: '', combinator: 'or' }),
			age,
		])

		expect(tokens[1]).toEqual({ kind: 'combinator', id: age.id, combinator: 'and', label: 'AND' })
	})

	it('names the group in each bracket token', () => {
		const group = createGroup('or', [rule(ageField, { operator: 'gt', value: 30 })])

		const tokens = stream([rule(nameField, { operator: 'contains', value: 'lee' }), group])

		expect(tokens.at(2)).toEqual({ kind: 'group-open', id: group.id })

		expect(tokens.at(-1)).toEqual({ kind: 'group-close', id: group.id })
	})

	it('emits combinator and bracket tokens in order for a nested group', () => {
		const tokens = stream([
			rule(nameField, { operator: 'contains', value: 'lee' }),
			createGroup('or', [rule(ageField, { operator: 'gt', value: 30 })]),
		])

		expect(tokens.map((token) => token.kind)).toEqual([
			'rule',
			'combinator',
			'group-open',
			'rule',
			'group-close',
		])
	})
})
