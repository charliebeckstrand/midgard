import { fc } from '@fast-check/vitest'
import { KNOWN_OPERATORS } from '../../modules/query/engine/query-evaluate'
import type { QueryGroup, QueryNode, QueryRule } from '../../modules/query/engine/types'

/**
 * A cell value or a rule value of each shape that the evaluator reads: text,
 * a number, a numeric string, a boolean, a blank, and a value of no scalar
 * shape.
 */
export const queryValue = (): fc.Arbitrary<unknown> =>
	fc.oneof(
		fc.string({ maxLength: 4 }),
		fc.integer({ min: -20, max: 20 }),
		fc.integer({ min: -20, max: 20 }).map(String),
		fc.boolean(),
		fc.constantFrom<unknown>(null, undefined, '', ' ', 'Ab', '2026-01-02', NaN),
		fc.tuple(
			fc.oneof(fc.integer({ min: -20, max: 20 }), fc.constantFrom<unknown>('', null, 'x')),
			fc.oneof(fc.integer({ min: -20, max: 20 }), fc.constantFrom<unknown>('', null, 'x')),
		),
		fc.constantFrom<unknown>([], [1], {}, [[1], 5]),
	)

const combinator = () => fc.option(fc.constantFrom<'and' | 'or'>('and', 'or'), { nil: undefined })

/** A rule over one of `fields`, with a known operator or an unknown one. */
const queryRule = (fields: readonly string[]): fc.Arbitrary<QueryRule> =>
	fc.record({
		id: fc.string({ maxLength: 3 }),
		type: fc.constant('rule' as const),
		combinator: combinator(),
		field: fc.constantFrom(...fields),
		operator: fc.constantFrom(...KNOWN_OPERATORS, 'bogus', 'toString'),
		value: queryValue(),
	})

/**
 * A query tree over `fields`, nested up to three levels. It holds rules that
 * constrain the rows, rules that do not, and empty groups.
 */
export function queryGroup(fields: readonly string[]): fc.Arbitrary<QueryGroup> {
	const { group } = fc.letrec<{ group: QueryGroup; node: QueryNode }>((tie) => ({
		group: fc.record({
			id: fc.string({ maxLength: 3 }),
			type: fc.constant('group' as const),
			combinator: combinator(),
			children: fc.array(tie('node'), { maxLength: 4 }),
		}),
		node: fc.oneof({ depthSize: 'small', withCrossShrink: true }, queryRule(fields), tie('group')),
	}))

	return group
}
