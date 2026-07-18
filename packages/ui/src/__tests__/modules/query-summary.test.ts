import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import {
	formatQuerySummary,
	type QuerySummaryToken,
	summarizeQuery,
} from '../../modules/query/engine/query-summary'
import type { QueryField } from '../../modules/query/engine/types'

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

describe('formatQuerySummary', () => {
	it('is empty for a query with no rules', () => {
		expect(formatQuerySummary(createGroup(), fields)).toBe('')
	})

	it('is empty when every rule is blank', () => {
		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: '' }),
			rule(ageField, { operator: 'gt', value: '' }),
		])

		expect(formatQuerySummary(group, fields)).toBe('')
	})

	it('renders a text rule as field, operator, and value', () => {
		const group = createGroup('and', [rule(nameField, { operator: 'contains', value: 'lee' })])

		expect(formatQuerySummary(group, fields)).toBe('Name contains lee')
	})

	it('resolves a select value to its option label', () => {
		const group = createGroup('and', [rule(statusField, { operator: 'equals', value: 'active' })])

		expect(formatQuerySummary(group, fields)).toBe('Status is Active')
	})

	it('falls back to the raw value when a select option is unknown', () => {
		const group = createGroup('and', [rule(statusField, { operator: 'equals', value: 'gone' })])

		expect(formatQuerySummary(group, fields)).toBe('Status is gone')
	})

	it('omits the value for a value-less operator', () => {
		const group = createGroup('and', [createRule(verifiedField)])

		expect(formatQuerySummary(group, fields)).toBe('Verified is true')
	})

	it('renders a number operator by its symbol', () => {
		const group = createGroup('and', [rule(ageField, { operator: 'gt', value: 30 })])

		expect(formatQuerySummary(group, fields)).toBe('Age > 30')
	})

	it('renders a two-bound range', () => {
		const group = createGroup('and', [rule(ageField, { operator: 'between', value: [10, 20] })])

		expect(formatQuerySummary(group, fields)).toBe('Age between 10 and 20')
	})

	it('renders a lower-bound-only range as ≥', () => {
		const group = createGroup('and', [rule(ageField, { operator: 'between', value: [18, ''] })])

		expect(formatQuerySummary(group, fields)).toBe('Age ≥ 18')
	})

	it('renders an upper-bound-only range as ≤', () => {
		const group = createGroup('and', [rule(ageField, { operator: 'between', value: ['', 65] })])

		expect(formatQuerySummary(group, fields)).toBe('Age ≤ 65')
	})

	it('renders a date value verbatim', () => {
		const group = createGroup('and', [
			rule(joinedField, { operator: 'before', value: '2026-01-01' }),
		])

		expect(formatQuerySummary(group, fields)).toBe('Joined before 2026-01-01')
	})

	it('joins active rules by the later rule’s combinator', () => {
		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: 'lee' }),
			rule(ageField, { operator: 'gt', value: 30, combinator: 'or' }),
		])

		expect(formatQuerySummary(group, fields)).toBe('Name contains lee OR Age > 30')
	})

	it('drops a blank middle rule along with its combinator', () => {
		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: 'lee' }),
			rule(ageField, { operator: 'gt', value: '', combinator: 'or' }),
			rule(statusField, { operator: 'equals', value: 'pending', combinator: 'and' }),
		])

		expect(formatQuerySummary(group, fields)).toBe('Name contains lee AND Status is Pending')
	})

	it('brackets a nested group and joins it by its own combinator', () => {
		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: 'lee' }),
			createGroup('or', [
				rule(ageField, { operator: 'gt', value: 30 }),
				rule(statusField, { operator: 'equals', value: 'pending', combinator: 'or' }),
			]),
		])

		expect(formatQuerySummary(group, fields)).toBe(
			'Name contains lee OR (Age > 30 OR Status is Pending)',
		)
	})

	it('drops a nested group with no active rules', () => {
		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: 'lee' }),
			createGroup('and', [rule(ageField, { operator: 'gt', value: '' })]),
		])

		expect(formatQuerySummary(group, fields)).toBe('Name contains lee')
	})

	it('renders an unresolved field and operator verbatim', () => {
		const group = createGroup('and', [
			{ ...createRule(nameField), field: 'gone', operator: 'contains', value: 'x' },
		])

		expect(formatQuerySummary(group, fields)).toBe('gone contains x')
	})
})

describe('summarizeQuery', () => {
	it('returns an empty stream for an inactive query', () => {
		expect(summarizeQuery(createGroup(), fields)).toEqual([])
	})

	it('returns one rule token carrying the resolved parts', () => {
		const group = createGroup('and', [rule(statusField, { operator: 'equals', value: 'active' })])

		expect(summarizeQuery(group, fields)).toEqual<QuerySummaryToken[]>([
			{ kind: 'rule', field: 'Status', operator: 'is', value: 'Active' },
		])
	})

	it('omits the value key for a value-less operator', () => {
		const [token] = summarizeQuery(createGroup('and', [createRule(verifiedField)]), fields)

		expect(token).toEqual({ kind: 'rule', field: 'Verified', operator: 'is true' })
	})

	it('emits combinator and bracket tokens in order for a nested group', () => {
		const group = createGroup('and', [
			rule(nameField, { operator: 'contains', value: 'lee' }),
			createGroup('or', [rule(ageField, { operator: 'gt', value: 30 })]),
		])

		expect(summarizeQuery(group, fields).map((token) => token.kind)).toEqual([
			'rule',
			'combinator',
			'group-open',
			'rule',
			'group-close',
		])
	})
})
