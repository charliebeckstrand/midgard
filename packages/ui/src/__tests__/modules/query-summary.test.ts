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
})

describe('summarizeQuery', () => {
	it('returns an empty stream for an inactive query', () => {
		expect(stream([])).toEqual([])
	})

	it('returns one rule token carrying the resolved parts', () => {
		expect(stream([rule(statusField, { operator: 'equals', value: 'active' })])).toEqual<
			QuerySummaryToken[]
		>([{ kind: 'rule', field: 'Status', operator: 'is', value: 'Active' }])
	})

	it('omits the value key for a value-less operator', () => {
		const [token] = stream([createRule(verifiedField)])

		expect(token).toEqual({ kind: 'rule', field: 'Verified', operator: 'is true' })
	})

	it('resolves the combinator to its AND/OR label', () => {
		const tokens = stream([
			rule(nameField, { operator: 'contains', value: 'lee' }),
			rule(ageField, { operator: 'gt', value: 30, combinator: 'or' }),
		])

		expect(tokens[1]).toEqual({ kind: 'combinator', label: 'OR' })
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
