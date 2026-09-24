import { imposesConstraint } from './query-evaluate'
import type { QueryGroup } from './types'

/**
 * Whether a query would actually constrain its result. It is true when any rule
 * (at any depth) puts a constraint on the rows by {@link imposesConstraint}.
 * Such a rule has an operator that the evaluator applies. The operator is
 * value-less (`is Empty`, `is true`, …), or its value is non-empty and has the
 * correct shape. For `between`, that shape is a `[min, max]` pair of blank or
 * scalar bounds. For each other operator, it is a string, a number, or a
 * boolean. For `gt`, `gte`, `lt`, `lte`, and `between`, the value or each set
 * bound must also convert to a finite number. A tree of only blank rules reads
 * as inactive. A freshly seeded or fully cleared builder leaves such a tree
 * behind. A filter affordance can therefore reflect a real constraint, rather
 * than the mere presence of a rule.
 *
 * @remarks The judgement is the evaluator's, so it reads no field set. A rule
 * whose operator the evaluator does not know reads as inactive, even when its
 * field offers that operator. A value-less operator reads as active, even when
 * its field does not offer it. {@link evaluateQuery} gives the same reading.
 *
 * @param group - The query group (typically the root) to test.
 */
export function isQueryActive(group: QueryGroup): boolean {
	return group.children.some((child) =>
		child.type === 'group' ? isQueryActive(child) : imposesConstraint(child.operator, child.value),
	)
}
