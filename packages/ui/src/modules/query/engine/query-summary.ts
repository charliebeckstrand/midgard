import { isEmptyValue, isRuleActive } from './query-active'
import { getOperators } from './query-operators'
import type { QueryCombinator, QueryField, QueryGroup, QueryOperator, QueryRule } from './types'

/**
 * One active rule as three resolved, display-ready parts: the field and
 * operator labels and, unless the operator is value-less (`is empty`, `is
 * true`), its value. A `select` value resolves to its option label; a
 * one-sided range renders as a `≥`/`≤` bound.
 */
export type QuerySummaryRuleToken = {
	kind: 'rule'
	field: string
	operator: string
	value?: string
}

/**
 * One element of a rendered query summary: an active {@link
 * QuerySummaryRuleToken}, the `and`/`or` `combinator` joining it to the
 * preceding sibling, or a `group-open`/`group-close` bracket around a nested
 * group. A flat, ordered stream — a sentence renderer joins it left-to-right; a
 * chip renderer draws each rule token as a chip and the rest as separators.
 */
export type QuerySummaryToken =
	| QuerySummaryRuleToken
	| { kind: 'combinator'; combinator: QueryCombinator }
	| { kind: 'group-open' }
	| { kind: 'group-close' }

/**
 * Formats a range operator's `[min, max]` value: `min and max` when both bounds
 * are set, else the open bound as a `≥`/`≤` relation. Reached only for an active
 * rule, so at least one bound is set.
 *
 * @internal
 */
function describeRange(
	field: string,
	operator: QueryOperator,
	value: unknown,
): QuerySummaryRuleToken {
	const [lo, hi] = Array.isArray(value) ? value : ['', '']

	if (!isEmptyValue(lo) && !isEmptyValue(hi)) {
		return { kind: 'rule', field, operator: operator.label, value: `${lo} and ${hi}` }
	}

	return isEmptyValue(lo)
		? { kind: 'rule', field, operator: '≤', value: `${hi}` }
		: { kind: 'rule', field, operator: '≥', value: `${lo}` }
}

/** Resolves a rule's display value: a `select` maps to its option label, everything else stringifies. @internal */
function describeValue(field: QueryField | undefined, value: unknown): string {
	if (field?.type === 'select') {
		return field.options?.find((option) => option.value === value)?.label ?? String(value ?? '')
	}

	return String(value ?? '')
}

/**
 * Describes one rule as a token, or `null` when the rule imposes no constraint
 * (mirrors {@link isRuleActive}, so a half-built or cleared rule drops out).
 * Unresolved field/operator names render verbatim, since such a rule can still
 * constrain the result.
 *
 * @internal
 */
function describeRule(rule: QueryRule, fields: QueryField[]): QuerySummaryRuleToken | null {
	if (!isRuleActive(rule, fields)) return null

	const field = fields.find((candidate) => candidate.name === rule.field)

	const operator = field && getOperators(field).find((option) => option.value === rule.operator)

	const label = field?.label ?? rule.field

	if (operator?.noValue) return { kind: 'rule', field: label, operator: operator.label }

	if (operator?.range) return describeRange(label, operator, rule.value)

	return {
		kind: 'rule',
		field: label,
		operator: operator?.label ?? rule.operator,
		value: describeValue(field, rule.value),
	}
}

/**
 * Describes a group's active children in order, each joined to the previous by
 * its combinator; a nested group with any active child is wrapped in
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
		const tokens =
			child.type === 'group'
				? describeGroup(child, fields, true)
				: toTokens(describeRule(child, fields))

		if (tokens.length === 0) continue

		if (body.length > 0) body.push({ kind: 'combinator', combinator: child.combinator ?? 'and' })

		body.push(...tokens)
	}

	if (nested && body.length > 0) return [{ kind: 'group-open' }, ...body, { kind: 'group-close' }]

	return body
}

/** Wraps a nullable rule token as a (possibly empty) token list. @internal */
function toTokens(token: QuerySummaryRuleToken | null): QuerySummaryToken[] {
	return token ? [token] : []
}

/**
 * Describes a query tree as a flat token stream — its active rules in order,
 * joined by their combinators and bracketed per nested group. Empty when the
 * query imposes no constraint (in step with {@link isQueryActive}), so a view
 * can render nothing rather than an empty sentence.
 *
 * @param group - The query group (typically the root) to describe.
 * @param fields - Field definitions resolving each rule's labels, operators, and options.
 */
export function summarizeQuery(group: QueryGroup, fields: QueryField[]): QuerySummaryToken[] {
	return describeGroup(group, fields, false)
}

/** Renders one token as its sentence fragment. @internal */
function renderToken(token: QuerySummaryToken): string {
	if (token.kind === 'combinator') return token.combinator === 'or' ? 'OR' : 'AND'

	if (token.kind === 'group-open') return '('

	if (token.kind === 'group-close') return ')'

	return token.value == null
		? `${token.field} ${token.operator}`
		: `${token.field} ${token.operator} ${token.value}`
}

/**
 * Renders a query tree as a single human-readable line, e.g. `Status is Active
 * AND (Age ≥ 18 OR Name contains lee)`. Convenience over {@link
 * summarizeQuery} for a plain-text surface (a `title`, an aria-label, a log);
 * empty when the query imposes no constraint.
 *
 * @param group - The query group (typically the root) to describe.
 * @param fields - Field definitions resolving each rule's labels, operators, and options.
 */
export function formatQuerySummary(group: QueryGroup, fields: QueryField[]): string {
	let line = ''

	let afterOpen = false

	for (const token of summarizeQuery(group, fields)) {
		const fragment = renderToken(token)

		const joined = line === '' || afterOpen || token.kind === 'group-close'

		line += joined ? fragment : ` ${fragment}`

		afterOpen = token.kind === 'group-open'
	}

	return line
}
