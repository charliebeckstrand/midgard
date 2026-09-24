// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import {
	createGroup,
	createRule,
	isQueryGroup,
	isQueryNode,
} from '../../modules/query/engine/query-node'
import {
	formatQuerySql,
	parseQuery,
	serializeQuery,
} from '../../modules/query/engine/query-serialize'
import type {
	QueryCombinator,
	QueryField,
	QueryGroup,
	QueryNode,
} from '../../modules/query/engine/types'

const nameField: QueryField = { name: 'name', label: 'Name', type: 'text' }

const ageField: QueryField = { name: 'age', label: 'Age', type: 'number' }

const fields = [nameField, ageField]

const rule = (field: string, operator: string, value?: unknown, combinator?: QueryCombinator) => ({
	...createRule(undefined, combinator),
	field,
	operator,
	value,
})

/** The tree without its ids, so two trees with equal content compare equal. */
const content = (node: QueryNode): unknown =>
	node.type === 'group'
		? { combinator: node.combinator ?? 'and', children: node.children.map(content) }
		: {
				combinator: node.combinator ?? 'and',
				field: node.field,
				operator: node.operator,
				value: node.value,
			}

/** The issues as `[kind, path]` pairs. */
const kinds = (text: string, options?: Parameters<typeof parseQuery>[1]) =>
	parseQuery(text, options).issues.map((issue) => [issue.kind, issue.path])

describe('isQueryNode', () => {
	it('accepts a rule, and a group of nodes', () => {
		expect(isQueryNode(rule('name', 'equals', 'Ada'))).toBe(true)

		expect(isQueryNode(createGroup('or', [rule('name', 'equals', 'Ada'), createGroup()]))).toBe(
			true,
		)
	})

	it.each([
		['a non-object', 'name = Ada'],
		['a node with no id', { type: 'rule', field: 'name', operator: 'equals' }],
		['a rule with no field', { id: 'r', type: 'rule', operator: 'equals' }],
		['a rule with no operator', { id: 'r', type: 'rule', field: 'name' }],
		['a bad combinator', { id: 'g', type: 'group', combinator: 'xor', children: [] }],
		['a group with no children', { id: 'g', type: 'group' }],
		['a group with a bad child', { id: 'g', type: 'group', children: [{ id: 'r' }] }],
	])('rejects %s', (_name, value) => {
		expect(isQueryNode(value)).toBe(false)
	})

	it('narrows a group with isQueryGroup, and rejects a rule', () => {
		expect(isQueryGroup(createGroup())).toBe(true)

		expect(isQueryGroup(rule('name', 'equals', 'Ada'))).toBe(false)
	})
})

describe('serializeQuery', () => {
	it('writes compact positional arrays with no ids', () => {
		const query = createGroup('and', [
			rule('name', 'contains', 'ad'),
			createGroup('or', [rule('age', 'between', [18, '']), rule('age', 'isEmpty')]),
		])

		expect(serializeQuery(query)).toBe(
			'["and",[["and","name","contains","ad"],["or",[["and","age","between",[18,""]],["and","age","isEmpty"]]]]]',
		)
	})

	it('gives an equal string for an equal query', () => {
		const a = createGroup('and', [rule('name', 'equals', 'Ada')])

		const b = createGroup('and', [rule('name', 'equals', 'Ada')])

		expect(a.id).not.toBe(b.id)

		expect(serializeQuery(a)).toBe(serializeQuery(b))
	})
})

/** An arbitrary rule value that JSON holds. */
const ruleValue = fc.oneof(
	fc.string(),
	fc.integer(),
	fc.boolean(),
	fc.constant(null),
	fc.tuple(fc.oneof(fc.integer(), fc.constant('')), fc.oneof(fc.integer(), fc.constant(''))),
)

const combinator = fc.constantFrom<QueryCombinator>('and', 'or')

/** An arbitrary query tree over free-form fields and operators. */
const tree = fc.letrec<{ node: QueryNode; group: QueryGroup }>((tie) => ({
	node: fc.oneof(
		{ depthSize: 'small', withCrossShrink: true },
		fc
			.tuple(fc.string(), fc.string(), ruleValue, combinator)
			.map(([field, operator, value, joiner]) => rule(field, operator, value, joiner)),
		tie('group'),
	),
	group: fc
		.tuple(combinator, fc.array(tie('node'), { maxLength: 4 }))
		.map(([joiner, children]) => createGroup(joiner, children)),
})).group

describe('parseQuery', () => {
	test.prop([tree])('reads back each tree that serializeQuery writes, with no issue', (query) => {
		const { value, issues } = parseQuery(serializeQuery(query))

		expect(issues).toEqual([])

		expect(value && content(value)).toEqual(content(query))

		expect(isQueryGroup(value)).toBe(true)
	})

	it('gives each node a new id', () => {
		const query = createGroup('and', [rule('name', 'equals', 'Ada')])

		const { value } = parseQuery(serializeQuery(query))

		expect(value?.id).not.toBe(query.id)

		expect(value?.children[0]?.id).not.toBe(query.children[0]?.id)
	})

	it('keeps a rule with no value item as an undefined value', () => {
		const { value } = parseQuery('["and",[["and","name","isEmpty"]]]')

		expect(value?.children[0]).toMatchObject({ field: 'name', operator: 'isEmpty' })

		expect(value?.children[0]).toHaveProperty('value', undefined)
	})

	it('gives no query and no issue for a missing param', () => {
		for (const text of [null, undefined, '']) {
			expect(parseQuery(text)).toEqual({ value: undefined, issues: [] })
		}
	})

	it('gives no query for text that is not JSON, or a root that is not a group', () => {
		expect(parseQuery('["and",')).toMatchObject({ value: undefined })

		expect(kinds('["and",')).toEqual([['invalid-json', '']])

		expect(kinds('{"type":"group"}')).toEqual([['invalid-root', '']])

		expect(kinds('["and","name","equals","Ada"]')).toEqual([['invalid-root', '']])
	})

	it('drops a node with the wrong shape, and keeps its siblings', () => {
		const text = '["and",[["and","name"],["and","name","equals","Ada"],["or",[42]],"x"]]'

		const { value } = parseQuery(text)

		expect(value && content(value)).toEqual({
			combinator: 'and',
			children: [
				{ combinator: 'and', field: 'name', operator: 'equals', value: 'Ada' },
				{ combinator: 'or', children: [] },
			],
		})

		expect(kinds(text)).toEqual([
			['invalid-node', 'children[0]'],
			['invalid-node', 'children[2].children[0]'],
			['invalid-node', 'children[3]'],
		])
	})

	it('repairs a bad combinator to "and"', () => {
		const text = '["xor",[["nand","name","equals","Ada"]]]'

		const { value } = parseQuery(text)

		expect(value?.combinator).toBe('and')

		expect(value?.children[0]?.combinator).toBe('and')

		expect(kinds(text)).toEqual([
			['invalid-combinator', ''],
			['invalid-combinator', 'children[0]'],
		])
	})

	it('drops a group deeper than 32 levels', () => {
		const text = `${'["and",['.repeat(40)}${']]'.repeat(40)}`

		const { value, issues } = parseQuery(text)

		expect(issues).toEqual([expect.objectContaining({ kind: 'too-deep' })])

		let depth = 0

		for (let node: QueryNode | undefined = value; node?.type === 'group'; ) {
			depth++

			node = node.children[0]
		}

		expect(depth).toBe(32)
	})

	it('with fields, drops a rule whose field or operator the fields do not offer', () => {
		const text =
			'["and",[["and","name","equals","Ada"],["and","email","equals","a@b"],["and","age","contains","4"]]]'

		const { value } = parseQuery(text, { fields })

		expect(value?.children).toHaveLength(1)

		expect(kinds(text, { fields })).toEqual([
			['unknown-field', 'children[1]'],
			['unknown-operator', 'children[2]'],
		])

		expect(kinds(text)).toEqual([])
	})
})

describe('formatQuerySql', () => {
	const sql = (children: QueryNode[], options?: Parameters<typeof formatQuerySql>[1]) =>
		formatQuerySql(createGroup('and', children), options)

	it.each([
		['equals', 'Ada', '"name" = ?', ['Ada']],
		['notEquals', 'Ada', '("name" IS NULL OR "name" <> ?)', ['Ada']],
		['contains', 'A_d%a!', `LOWER("name") LIKE ? ESCAPE '!'`, ['%a!_d!%a!!%']],
		['startsWith', 'Ad', `LOWER("name") LIKE ? ESCAPE '!'`, ['ad%']],
		['endsWith', 'Ad', `LOWER("name") LIKE ? ESCAPE '!'`, ['%ad']],
		['isEmpty', undefined, `("name" IS NULL OR "name" = '')`, []],
		['isNotEmpty', undefined, `("name" IS NOT NULL AND "name" <> '')`, []],
		['gt', '40', '"name" > ?', [40]],
		['gte', 40, '"name" >= ?', [40]],
		['lt', 40, '"name" < ?', [40]],
		['lte', 40, '"name" <= ?', [40]],
		['between', [18, 65], '"name" BETWEEN ? AND ?', [18, 65]],
		['between', [18, ''], '"name" >= ?', [18]],
		['between', ['', 65], '"name" <= ?', [65]],
		['before', '2026-01-01', '"name" < ?', ['2026-01-01']],
		['after', '2026-01-01', '"name" > ?', ['2026-01-01']],
		['isTrue', null, '"name" = ?', [true]],
		['isFalse', null, '"name" = ?', [false]],
	])('formats %s %j', (operator, value, text, params) => {
		expect(sql([rule('name', operator, value)])).toEqual({ sql: text, params })
	})

	it('folds left to right with no AND over OR precedence', () => {
		const query = [
			rule('name', 'equals', 'a'),
			rule('name', 'equals', 'b', 'or'),
			rule('age', 'gt', 1, 'and'),
		]

		// The evaluator reads (a OR b) AND c, not a OR (b AND c).
		expect(sql(query)).toEqual({
			sql: '(("name" = ? OR "name" = ?) AND "age" > ?)',
			params: ['a', 'b', 1],
		})
	})

	it('brackets a nested group', () => {
		const query = [
			rule('age', 'gt', 1),
			createGroup('and', [rule('name', 'equals', 'a'), rule('name', 'equals', 'b', 'or')]),
		]

		expect(sql(query).sql).toBe('("age" > ? AND ("name" = ? OR "name" = ?))')
	})

	it('drops a rule with no constraint, as the evaluator does', () => {
		expect(sql([rule('name', 'equals', ''), rule('age', 'gt', 1)])).toEqual({
			sql: '"age" > ?',
			params: [1],
		})

		expect(sql([rule('name', 'custom', 'x'), rule('age', 'gt', 1)]).sql).toBe('"age" > ?')

		// OR with a rule that constrains nothing constrains nothing.
		expect(sql([rule('age', 'gt', 1), rule('name', 'equals', '', 'or')])).toEqual({
			sql: '',
			params: [],
		})

		expect(sql([createGroup(), rule('age', 'gt', 1)]).sql).toBe('"age" > ?')
	})

	it('gives an empty condition for an empty query', () => {
		expect(sql([])).toEqual({ sql: '', params: [] })
	})

	it('uses the column and placeholder options', () => {
		const query = [rule('name', 'equals', 'a'), rule('age', 'between', [1, 2])]

		expect(
			sql(query, { column: (field) => `u.${field}`, placeholder: (index) => `$${index}` }),
		).toEqual({ sql: '(u.name = $1 AND u.age BETWEEN $2 AND $3)', params: ['a', 1, 2] })
	})

	it('quotes a field name so that it cannot close its identifier', () => {
		expect(sql([rule('a" OR 1=1 --', 'equals', 'x')]).sql).toBe('"a"" OR 1=1 --" = ?')
	})
})
