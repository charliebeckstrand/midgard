import {
	imposesConstraint,
	isEmptyValue,
	RANGE_OPERATORS,
	VALUELESS_OPERATORS,
} from './query-evaluate'
import { getOperators } from './query-operators'
import type { QueryCombinator, QueryField, QueryGroup, QueryOperator, QueryRule } from './types'

/**
 * One active rule as three resolved, display-ready parts: the field and
 * operator labels, and its value. The value is the rule's own, the operator's
 * fixed `valueLabel` (`is Empty`), or none at all for a value-less operator
 * without one (`is true`). A `select` value resolves to its option label; a one-sided
 * range renders as a `≥`/`≤` bound.
 */
export type QuerySummaryRuleToken = {
	kind: 'rule'
	/** The id of the rule, for an edit on the source tree. */
	id: string
	field: string
	operator: string
	value?: string
}

/**
 * One element of a rendered query summary:
 *
 * - an active {@link QuerySummaryRuleToken};
 * - the `AND`/`OR` `label` joining it to the preceding sibling;
 * - a `group-open`/`group-close` bracket around a nested group.
 *
 * A flat, ordered stream of display-ready pieces. A sentence renderer joins it
 * left-to-right. A chip renderer draws each rule token as a chip, and the rest
 * as separators.
 *
 * @remarks Each token carries the `id` of its source node, so an interactive
 * renderer can edit the tree. A combinator token names the node whose
 * `combinator` it shows, which is the node after it. A bracket names its group.
 */
export type QuerySummaryToken =
	| QuerySummaryRuleToken
	| { kind: 'combinator'; id: string; combinator: QueryCombinator; label: string }
	| { kind: 'group-open'; id: string }
	| { kind: 'group-close'; id: string }

/**
 * Formats a range operator's `[min, max]` value: `min and max` when both bounds
 * are set, else the open bound as a `≥`/`≤` relation. Reached only for an active
 * range rule, so the value is a `[min, max]` pair with at least one bound set.
 *
 * @internal
 */
function describeRange(
	id: string,
	field: string,
	operator: string,
	value: unknown,
): QuerySummaryRuleToken {
	const [lo, hi] = value as unknown[]

	if (!isEmptyValue(lo) && !isEmptyValue(hi)) {
		return { kind: 'rule', id, field, operator, value: `${lo} and ${hi}` }
	}

	return isEmptyValue(lo)
		? { kind: 'rule', id, field, operator: '≤', value: `${hi}` }
		: { kind: 'rule', id, field, operator: '≥', value: `${lo}` }
}

/** Resolves a rule's display value: a `select` maps to its option label, everything else stringifies. @internal */
function describeValue(field: QueryField | undefined, value: unknown): string {
	const raw = String(value ?? '')

	if (field?.type === 'select') {
		return field.options?.find((option) => option.value === value)?.label ?? raw
	}

	return raw
}

/**
 * Resolves a rule against the field set: the `field` it names and the
 * `operator` from that field's set, each `undefined` when unresolved. The
 * summary reads its labels and options from them. It does not read the active
 * judgement or the form of a token from them.
 *
 * @internal
 */
function resolveRule(
	rule: QueryRule,
	fields: QueryField[],
): { field: QueryField | undefined; operator: QueryOperator | undefined } {
	const field = fields.find((candidate) => candidate.name === rule.field)

	const operator = field && getOperators(field).find((option) => option.value === rule.operator)

	return { field, operator }
}

/**
 * Describes one rule as a token, or `null` when the rule imposes no constraint
 * ({@link imposesConstraint}). A blank or half-built rule drops out, and so
 * does a rule whose operator the evaluator does not know. The summary thus
 * shows only the rules that {@link evaluateQuery} applies to the rows.
 *
 * @remarks The field set gives only the labels and the options. The operator
 * name selects the form of the token, value-less, range, or scalar, as it does
 * in the evaluator. A rule whose field or operator the field set does not offer
 * still constrains the rows when the evaluator applies it. Such a rule renders
 * its unresolved names verbatim.
 *
 * @internal
 */
export function describeRule(rule: QueryRule, fields: QueryField[]): QuerySummaryRuleToken | null {
	if (!imposesConstraint(rule.operator, rule.value)) return null

	const { field, operator } = resolveRule(rule, fields)

	const label = field?.label ?? rule.field

	// A value-less operator carries no rule value; it renders its fixed
	// `valueLabel` ("is Empty") when it names one, else operator alone ("is true").
	if (VALUELESS_OPERATORS.has(rule.operator)) {
		return {
			kind: 'rule',
			id: rule.id,
			field: label,
			operator: operator?.label ?? rule.operator,
			...(operator?.valueLabel ? { value: operator.valueLabel } : {}),
		}
	}

	if (RANGE_OPERATORS.has(rule.operator)) {
		return describeRange(rule.id, label, operator?.label ?? rule.operator, rule.value)
	}

	return {
		kind: 'rule',
		id: rule.id,
		field: label,
		operator: operator?.label ?? rule.operator,
		value: describeValue(field, rule.value),
	}
}

/**
 * Describes a group's active children in order, each joined to the previous by
 * its `AND`/`OR` label. A nested group with any active child is wrapped in
 * brackets. Inactive rules and empty groups drop out, taking their leading
 * combinator with them.
 *
 * @internal
 */
function describeGroup(
	group: QueryGroup,
	fields: QueryField[],
	nested: boolean,
): QuerySummaryToken[] {
	const body: QuerySummaryToken[] = []

	for (const child of group.children) {
		// An inactive rule describes to `null`, which the filter drops.
		const tokens: QuerySummaryToken[] =
			child.type === 'group'
				? describeGroup(child, fields, true)
				: [describeRule(child, fields)].filter((token) => token !== null)

		if (tokens.length === 0) continue

		if (body.length > 0) {
			const combinator = child.combinator ?? 'and'

			body.push({
				kind: 'combinator',
				id: child.id,
				combinator,
				label: combinator === 'or' ? 'OR' : 'AND',
			})
		}

		body.push(...tokens)
	}

	if (nested && body.length > 0) {
		return [{ kind: 'group-open', id: group.id }, ...body, { kind: 'group-close', id: group.id }]
	}

	return body
}

/**
 * Describes a query tree as a flat token stream — its active rules in order,
 * joined by their combinators and bracketed per nested group. Empty when the
 * query imposes no constraint (in step with {@link isQueryActive}), so a view
 * can render nothing rather than an empty sentence.
 *
 * @remarks `QuerySummary` renders the stream as a sentence, and `QueryChips`
 * renders it as a row of chips. Use it for a third view.
 *
 * @param group - The query group (typically the root) to describe.
 * @param fields - Field definitions resolving each rule's labels, operators, and options.
 */
export function summarizeQuery(group: QueryGroup, fields: QueryField[]): QuerySummaryToken[] {
	return describeGroup(group, fields, false)
}

/**
 * Whether a space precedes `token` in a rendered summary. There is none at the
 * start, none after an opening bracket, and none before a closing one, so
 * brackets hug their contents. Shared by the string and React renderers so their spacing can't
 * drift.
 *
 * @internal
 */
export function spacedBefore(
	previous: QuerySummaryToken | undefined,
	token: QuerySummaryToken,
): boolean {
	return previous != null && previous.kind !== 'group-open' && token.kind !== 'group-close'
}

/** Renders one token as its sentence fragment. @internal */
export function renderToken(token: QuerySummaryToken): string {
	if (token.kind === 'combinator') return token.label

	if (token.kind === 'group-open') return '('

	if (token.kind === 'group-close') return ')'

	return token.value == null
		? `${token.field} ${token.operator}`
		: `${token.field} ${token.operator} ${token.value}`
}

/**
 * Renders a query tree as a single human-readable line, e.g. `Status is Active
 * AND (Age ≥ 18 OR Name contains lee)`. Convenience over {@link summarizeQuery}
 * for a plain-text surface (a `title`, an aria-label, a log); empty when the
 * query imposes no constraint.
 *
 * @param group - The query group (typically the root) to describe.
 * @param fields - Field definitions resolving each rule's labels, operators, and options.
 */
export function formatQuerySummary(group: QueryGroup, fields: QueryField[]): string {
	const tokens = summarizeQuery(group, fields)

	return tokens
		.map(
			(token, index) => `${spacedBefore(tokens[index - 1], token) ? ' ' : ''}${renderToken(token)}`,
		)
		.join('')
}
