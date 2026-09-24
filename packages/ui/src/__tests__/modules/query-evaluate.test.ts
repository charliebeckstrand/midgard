// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { isQueryActive } from '../../modules/query/engine/query-active'
import { evaluateQuery, matchQueryRule } from '../../modules/query/engine/query-evaluate'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import { summarizeQuery } from '../../modules/query/engine/query-summary'
import type { QueryField, QueryRule } from '../../modules/query/engine/types'

describe('matchQueryRule', () => {
	it('matches text operators case-insensitively', () => {
		expect(matchQueryRule('contains', 'Alice', 'ali')).toBe(true)

		expect(matchQueryRule('startsWith', 'Alice', 'al')).toBe(true)

		expect(matchQueryRule('endsWith', 'Alice', 'CE')).toBe(true)

		expect(matchQueryRule('equals', 'Alice', 'Alice')).toBe(true)

		expect(matchQueryRule('notEquals', 'Alice', 'Bob')).toBe(true)
	})

	it('matches numeric operators', () => {
		expect(matchQueryRule('gt', 5, 3)).toBe(true)

		expect(matchQueryRule('lte', 3, 3)).toBe(true)

		expect(matchQueryRule('lt', 5, 3)).toBe(false)
	})

	it('handles noValue and unknown operators', () => {
		expect(matchQueryRule('isEmpty', '', undefined)).toBe(true)

		expect(matchQueryRule('isNotEmpty', 'x', undefined)).toBe(true)

		// An unknown (half-built) operator imposes no constraint.
		expect(matchQueryRule('???', 'x', 'y')).toBe(true)

		// An inherited object key is not a matcher, so it does not run.
		expect(matchQueryRule('valueOf', 'x', 'y')).toBe(true)
	})

	it('imposes no constraint when a value-requiring operator has an empty value', () => {
		// A cleared date rule (operator "on" → equals, value blank) must match every
		// row, not hide them all — the regression behind "clear the filter and the
		// rows don't come back".
		expect(matchQueryRule('equals', '2026-01-15', '')).toBe(true)

		expect(matchQueryRule('before', '2026-01-15', '')).toBe(true)

		expect(matchQueryRule('after', '2026-01-15', undefined)).toBe(true)

		// Same for a blank numeric comparison and a blank text match.
		expect(matchQueryRule('gt', 5, '')).toBe(true)

		expect(matchQueryRule('lt', 5, '')).toBe(true)

		expect(matchQueryRule('contains', 'Alice', '   ')).toBe(true)
	})

	it('still constrains when a value-requiring operator has a value', () => {
		expect(matchQueryRule('equals', '2026-01-15', '2026-01-15')).toBe(true)

		expect(matchQueryRule('equals', '2026-01-15', '2026-02-01')).toBe(false)

		expect(matchQueryRule('before', '2026-01-15', '2026-02-01')).toBe(true)
	})

	it('matches the between range operator inclusively', () => {
		expect(matchQueryRule('between', 5, [1, 10])).toBe(true)

		expect(matchQueryRule('between', 1, [1, 10])).toBe(true)

		expect(matchQueryRule('between', 10, [1, 10])).toBe(true)

		expect(matchQueryRule('between', 11, [1, 10])).toBe(false)
	})

	it('treats a blank between bound as open-ended', () => {
		// Only a lower bound: everything at or above it.
		expect(matchQueryRule('between', 100, [10, ''])).toBe(true)

		expect(matchQueryRule('between', 5, [10, ''])).toBe(false)

		// Only an upper bound: everything at or below it.
		expect(matchQueryRule('between', 5, ['', 10])).toBe(true)

		expect(matchQueryRule('between', 50, ['', 10])).toBe(false)

		// Both blank constrains nothing; a non-tuple value is ignored.
		expect(matchQueryRule('between', 5, ['', ''])).toBe(true)

		expect(matchQueryRule('between', 5, undefined)).toBe(true)

		expect(matchQueryRule('between', 5, 7)).toBe(true)
	})

	it('imposes no constraint when a scalar operator reads a value that is not a scalar', () => {
		expect(matchQueryRule('gt', 5, [10])).toBe(true)

		expect(matchQueryRule('contains', 'Alice', { text: 'Bob' })).toBe(true)

		expect(matchQueryRule('after', '2026-01-15', new Date('2026-01-01'))).toBe(true)
	})

	it('imposes no constraint when a between bound is not a scalar', () => {
		expect(matchQueryRule('between', 5, [[10], ''])).toBe(true)

		expect(matchQueryRule('between', 5, ['', { max: 1 }])).toBe(true)
	})

	it('imposes no constraint when a between value is not a pair', () => {
		expect(matchQueryRule('between', 5, [10])).toBe(true)

		expect(matchQueryRule('between', 5, [10, 20, 30])).toBe(true)
	})

	it('reads a whitespace-only between bound as open', () => {
		expect(matchQueryRule('between', -5, ['  ', 10])).toBe(true)

		expect(matchQueryRule('between', 100, [10, '\t'])).toBe(true)
	})

	it('reads a null between bound as open', () => {
		expect(matchQueryRule('between', 5, [null, 10])).toBe(true)

		expect(matchQueryRule('between', 50, [null, 10])).toBe(false)
	})

	it('reads a boolean value as a scalar', () => {
		expect(matchQueryRule('equals', true, true)).toBe(true)

		expect(matchQueryRule('equals', false, true)).toBe(false)
	})
})

describe('evaluateQuery', () => {
	const textField: QueryField = { name: 'name', label: 'Name', type: 'text' }

	const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

	const getValue = (row: { name: string; age: number }) => (field: string) =>
		field === 'name' ? row.name : row.age

	it('matches everything for an empty group', () => {
		expect(evaluateQuery(createGroup('and'), () => undefined)).toBe(true)
	})

	it('ANDs sibling rules', () => {
		const tree = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: 'li' },
			{ ...createRule(numberField), operator: 'gt', value: 20 },
		])

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 30 }))).toBe(true)

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(false)
	})

	it('ORs sibling rules by their combinator', () => {
		const tree = createGroup('and', [
			{ ...createRule(textField), operator: 'equals', value: 'Bob' },
			{ ...createRule(numberField), combinator: 'or', operator: 'gt', value: 20 },
		])

		// name is not Bob, but age > 20 — the OR rule carries it.
		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 30 }))).toBe(true)

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(false)
	})

	it('drops a rule with no constraint from the fold, with its combinator', () => {
		const tree = createGroup('and', [
			{ ...createRule(numberField), operator: 'gt', value: 20 },
			{ ...createRule(textField), combinator: 'or', operator: 'contains', value: '' },
		])

		// `Age > 20 OR (blank)` reads as `Age > 20`, as the summary shows it.
		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(false)

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 30 }))).toBe(true)
	})

	it('drops a leading rule with no constraint, so the next rule leads', () => {
		const tree = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: '' },
			{ ...createRule(numberField), combinator: 'or', operator: 'gt', value: 20 },
			{ ...createRule(textField), combinator: 'and', operator: 'contains', value: 'li' },
		])

		expect(evaluateQuery(tree, getValue({ name: 'Bob', age: 30 }))).toBe(false)

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 30 }))).toBe(true)
	})

	it('drops a group with no constraint from the fold', () => {
		const blank = { ...createRule(textField), operator: 'contains', value: '' }

		const tree = createGroup('and', [
			{ ...createRule(numberField), operator: 'gt', value: 20 },
			createGroup('or', [blank]),
			createGroup('or'),
		])

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(false)
	})

	it('matches every row when no rule puts a constraint on it', () => {
		const tree = createGroup('and', [
			{ ...createRule(textField), operator: 'contains', value: '' },
			{ ...createRule(numberField), combinator: 'or', operator: 'gt', value: '' },
		])

		expect(evaluateQuery(tree, getValue({ name: 'Alice', age: 10 }))).toBe(true)
	})
})

// The tables above hold the documented examples. The properties below read the
// same two functions over generated operators, values, and trees.

/** Every operator the matcher knows. */
const OPERATORS = [
	'equals',
	'notEquals',
	'contains',
	'startsWith',
	'endsWith',
	'isEmpty',
	'isNotEmpty',
	'gt',
	'gte',
	'lt',
	'lte',
	'between',
	'before',
	'after',
	'isTrue',
	'isFalse',
]

/** One field of each type, so the summary reads each default operator set. */
const FIELDS: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
	{ name: 'joined', label: 'Joined', type: 'date' },
	{ name: 'status', label: 'Status', type: 'select', options: [{ value: 'a', label: 'A' }] },
	{ name: 'verified', label: 'Verified', type: 'boolean' },
]

/** Operators that read no rule value, so an empty value never stands them down. */
const VALUELESS = ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse']

/** Operators that need a value, which is the set the empty-value rule governs. */
const NEEDS_VALUE = OPERATORS.filter((operator) => !VALUELESS.includes(operator))

/** The shapes a cleared input leaves behind, each of which must constrain nothing. */
const emptyValue = () =>
	fc.constantFrom<unknown>(null, undefined, '', '   ', '\t', [], ['', ''], [null, undefined])

/** A cell value of any kind the grid hands the matcher. */
const fieldValue = () =>
	fc.oneof(
		fc.string({ maxLength: 6 }),
		fc.integer({ min: -50, max: 50 }),
		fc.boolean(),
		fc.constantFrom<unknown>(null, undefined, ''),
	)

/** A finite number, which is the domain the numeric operators state an order over. */
const numeric = () => fc.integer({ min: -1000, max: 1000 })

/** A value that is not a scalar, so it has the wrong shape for a scalar operator or a range bound. */
const nonScalar = () => fc.oneof(fc.array(fieldValue(), { minLength: 1 }), fc.object(), fc.date())

/** A rule value that survives a trim, so the empty-value rule does not stand the operator down. */
const stated = () => fc.string({ minLength: 1, maxLength: 6 }).filter((text) => text.trim() !== '')

describe('matchQueryRule · properties', () => {
	test.prop([fc.constantFrom(...NEEDS_VALUE), fieldValue(), emptyValue()])(
		'imposes no constraint when the rule value is empty',
		(operator, value, blank) => {
			expect(matchQueryRule(operator, value, blank)).toBe(true)
		},
	)

	test.prop([fieldValue(), fieldValue()])(
		'imposes no constraint for an operator it does not know',
		(value, rule) => {
			expect(matchQueryRule('notAnOperator', value, rule)).toBe(true)
		},
	)

	// Each operator but `between` reads a scalar. An array, an object, or a
	// `Date` has the wrong shape, so the operator stands down.
	test.prop([
		fc.constantFrom(...NEEDS_VALUE.filter((operator) => operator !== 'between')),
		fieldValue(),
		nonScalar(),
	])(
		'imposes no constraint when a scalar operator reads a value that is not a scalar',
		(operator, value, rule) => {
			expect(matchQueryRule(operator, value, rule)).toBe(true)
		},
	)

	// Each bound of a range is blank or a scalar. A bound of a different shape,
	// on either side, makes the range stand down.
	test.prop([fieldValue(), nonScalar(), fc.oneof(numeric(), fc.constant('')), fc.boolean()])(
		'imposes no constraint when a between bound is not a scalar',
		(value, bound, other, first) => {
			expect(matchQueryRule('between', value, first ? [bound, other] : [other, bound])).toBe(true)
		},
	)

	// A range is a `[min, max]` pair. An array of scalar bounds with another
	// length makes the range stand down.
	test.prop([
		fieldValue(),
		fc
			.array(fc.oneof(numeric(), fc.constant('')), { maxLength: 5 })
			.filter((range) => range.length !== 2),
	])('imposes no constraint when a between value is not a pair', (value, range) => {
		expect(matchQueryRule('between', value, range)).toBe(true)
	})

	// The rule value must survive a trim. A value-requiring operator stands down
	// on an empty value, and `isEmptyValue` reads a run of spaces as empty, so a
	// blank rule makes both sides true and the pair stops being opposite.
	test.prop([fieldValue(), stated()])(
		'reads equals and notEquals as exact opposites',
		(value, rule) => {
			expect(matchQueryRule('equals', value, rule)).toBe(!matchQueryRule('notEquals', value, rule))
		},
	)

	test.prop([fieldValue()])('reads isEmpty and isNotEmpty as exact opposites', (value) => {
		expect(matchQueryRule('isEmpty', value, undefined)).toBe(
			!matchQueryRule('isNotEmpty', value, undefined),
		)
	})

	test.prop([fieldValue()])('never reads a value as both true and false', (value) => {
		expect(
			matchQueryRule('isTrue', value, undefined) && matchQueryRule('isFalse', value, undefined),
		).toBe(false)
	})

	// A prefix and a suffix are each a substring, so either match obliges the
	// looser one. The relation holds whatever the two strings are.
	test.prop([fc.string({ maxLength: 8 }), stated()])(
		'contains whatever it starts with or ends with',
		(value, rule) => {
			if (matchQueryRule('startsWith', value, rule)) {
				expect(matchQueryRule('contains', value, rule)).toBe(true)
			}

			if (matchQueryRule('endsWith', value, rule)) {
				expect(matchQueryRule('contains', value, rule)).toBe(true)
			}
		},
	)

	test.prop([numeric(), numeric()])('reads gt and lte as exact opposites', (value, rule) => {
		expect(matchQueryRule('gt', value, rule)).toBe(!matchQueryRule('lte', value, rule))
	})

	test.prop([numeric(), numeric()])('reads lt and gte as exact opposites', (value, rule) => {
		expect(matchQueryRule('lt', value, rule)).toBe(!matchQueryRule('gte', value, rule))
	})

	// The range operator is the conjunction of its two bounds, which is the
	// reading the one-sided cases below also rest on.
	test.prop([numeric(), numeric(), numeric()])(
		'reads between as its lower bound and its upper bound together',
		(value, low, high) => {
			expect(matchQueryRule('between', value, [low, high])).toBe(
				matchQueryRule('gte', value, low) && matchQueryRule('lte', value, high),
			)
		},
	)

	test.prop([numeric(), numeric()])('opens a blank between bound', (value, bound) => {
		expect(matchQueryRule('between', value, [bound, ''])).toBe(matchQueryRule('gte', value, bound))

		expect(matchQueryRule('between', value, ['', bound])).toBe(matchQueryRule('lte', value, bound))
	})

	// A bound of whitespace only is blank, as `isEmptyValue` reads it. So it is
	// open, and it does not read as the number 0.
	test.prop([numeric(), numeric(), fc.constantFrom(' ', '  ', '\t', '\n')])(
		'opens a whitespace-only between bound',
		(value, bound, blank) => {
			expect(matchQueryRule('between', value, [bound, blank])).toBe(
				matchQueryRule('gte', value, bound),
			)

			expect(matchQueryRule('between', value, [blank, bound])).toBe(
				matchQueryRule('lte', value, bound),
			)
		},
	)
})

/** One child of a generated tree: its truth, and how it joins the child before it. */
type Leaf = { truth: boolean; combinator: 'and' | 'or' }

const leaf = () =>
	fc.record({ truth: fc.boolean(), combinator: fc.constantFrom<'and' | 'or'>('and', 'or') })

/** A rule that reads back exactly `leaf.truth`, through the value-less `isTrue`. */
function truthRule(leafSpec: Leaf, index: number): QueryRule {
	return {
		id: `r${index}`,
		type: 'rule',
		combinator: leafSpec.combinator,
		field: `f${index}`,
		operator: 'isTrue',
		value: null,
	}
}

/** Reads `f<n>` back as the nth truth, so each rule is driven on its own. */
const readTruths = (truths: boolean[]) => (field: string) => truths[Number(field.slice(1))]

/**
 * The left fold the engine documents: no AND/OR precedence, sequential, in the
 * builder's visual order. Three lines over booleans, against a walk of a tree —
 * so the two never share a mistake.
 */
function foldLeft(leaves: Leaf[]): boolean {
	let result = (leaves[0] as Leaf).truth

	for (const item of leaves.slice(1)) {
		result = item.combinator === 'and' ? result && item.truth : result || item.truth
	}

	return result
}

describe('evaluateQuery · properties', () => {
	test.prop([fc.array(leaf(), { minLength: 1, maxLength: 6 })])(
		'folds its children left to right, with no precedence',
		(leaves) => {
			const tree = createGroup(
				'and',
				leaves.map((item, index) => truthRule(item, index)),
			)

			const truths = leaves.map((item) => item.truth)

			expect(evaluateQuery(tree, readTruths(truths))).toBe(foldLeft(leaves))
		},
	)

	// A nested group is one operand of its parent's fold, whatever it holds.
	test.prop([
		leaf(),
		fc.array(leaf(), { minLength: 1, maxLength: 4 }),
		fc.constantFrom('and', 'or'),
	])('folds a nested group as a single operand', (head, inner, join) => {
		const innerRules = inner.map((item, index) => truthRule(item, index + 1))

		const subgroup = { ...createGroup('and', innerRules), combinator: join }

		const tree = createGroup('and', [truthRule(head, 0), subgroup])

		const truths = [head.truth, ...inner.map((item) => item.truth)]

		const expected = join === 'and' ? head.truth && foldLeft(inner) : head.truth || foldLeft(inner)

		expect(evaluateQuery(tree, readTruths(truths))).toBe(expected)
	})

	test.prop([fc.array(leaf(), { minLength: 1, maxLength: 4 })])(
		'reads a lone nested group as that group',
		(leaves) => {
			const inner = createGroup(
				'and',
				leaves.map((item, index) => truthRule(item, index)),
			)

			const truths = leaves.map((item) => item.truth)

			expect(evaluateQuery(createGroup('and', [inner]), readTruths(truths))).toBe(
				evaluateQuery(inner, readTruths(truths)),
			)
		},
	)

	// A blank rule puts no constraint on the rows. So it drops out of the fold
	// wherever it sits, with either combinator, and the result does not change.
	test.prop([
		fc.array(leaf(), { minLength: 1, maxLength: 6 }),
		fc.array(fc.record({ at: fc.nat(), combinator: fc.constantFrom<'and' | 'or'>('and', 'or') }), {
			maxLength: 3,
		}),
	])('drops a blank rule wherever it sits', (leaves, blanks) => {
		const children: QueryRule[] = leaves.map((item, index) => truthRule(item, index))

		for (const [index, blank] of blanks.entries()) {
			children.splice(blank.at % (children.length + 1), 0, {
				id: `b${index}`,
				type: 'rule',
				combinator: blank.combinator,
				field: 'blank',
				operator: 'contains',
				value: '',
			})
		}

		const truths = leaves.map((item) => item.truth)

		expect(evaluateQuery(createGroup('and', children), readTruths(truths))).toBe(foldLeft(leaves))
	})

	test.prop([fc.constantFrom<'and' | 'or'>('and', 'or')])(
		'matches every row for an empty group',
		(combinator) => {
			expect(evaluateQuery(createGroup(combinator), () => undefined)).toBe(true)
		},
	)

	// The filter accent reads `isQueryActive`, and the summary and chips read
	// `summarizeQuery`. Both read a rule through the evaluator's own judgement.
	// So when they read a rule as inactive, the rule drops out of the fold.
	test.prop([
		fc.constantFrom(...OPERATORS, 'custom', 'toString', 'valueOf', ''),
		fc.oneof(emptyValue(), stated(), fieldValue()),
		fc.constantFrom(...FIELDS),
		fieldValue(),
	])('reads a rule as the active judgement and the summary do', (operator, value, field, cell) => {
		const group = createGroup('and', [{ ...createRule(field), operator, value }])

		const active = isQueryActive(group)

		expect(summarizeQuery(group, FIELDS).length > 0).toBe(active)

		if (!active) expect(evaluateQuery(group, () => cell)).toBe(true)
	})
})
