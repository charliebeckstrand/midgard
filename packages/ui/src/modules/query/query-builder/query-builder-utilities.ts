import type {
	QueryCombinator,
	QueryField,
	QueryFieldType,
	QueryGroup,
	QueryNode,
	QueryOperator,
	QueryRule,
} from './types'

let counter = 0

function nextId(): string {
	counter++

	return `q${counter}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Creates a fresh {@link QueryRule} with a unique id, defaulting its operator to
 * the field's first and its value to the type-appropriate empty value.
 *
 * @param field - Seeds the rule's field, operator, and value; omit for an empty rule.
 * @param combinator - How the rule joins its preceding sibling. @defaultValue 'and'
 */
export function createRule(field?: QueryField, combinator: QueryCombinator = 'and'): QueryRule {
	const operators = field ? getOperators(field) : []

	return {
		id: nextId(),
		type: 'rule',
		combinator,
		field: field?.name ?? '',
		operator: operators[0]?.value ?? '',
		value: defaultValueFor(field),
	}
}

/**
 * Creates a fresh {@link QueryGroup} with a unique id.
 *
 * @param combinator - How the group joins its preceding sibling. @defaultValue 'and'
 * @param children - Initial child nodes. @defaultValue `[]`
 */
export function createGroup(
	combinator: QueryCombinator = 'and',
	children: QueryNode[] = [],
): QueryGroup {
	return { id: nextId(), type: 'group', combinator, children }
}

function defaultValueFor(field?: QueryField): unknown {
	if (!field) return ''

	if (field.type === 'boolean') return null

	if (field.type === 'select') return field.options?.[0]?.value ?? ''

	if (field.type === 'number') return ''

	return ''
}

const defaultOperators = {
	text: [
		{ value: 'equals', label: 'equals' },
		{ value: 'notEquals', label: 'does not equal' },
		{ value: 'contains', label: 'contains' },
		{ value: 'startsWith', label: 'starts with' },
		{ value: 'endsWith', label: 'ends with' },
		{ value: 'isEmpty', label: 'is empty', noValue: true },
		{ value: 'isNotEmpty', label: 'is not empty', noValue: true },
	],
	number: [
		{ value: 'equals', label: '=' },
		{ value: 'notEquals', label: '≠' },
		{ value: 'gt', label: '>' },
		{ value: 'gte', label: '≥' },
		{ value: 'lt', label: '<' },
		{ value: 'lte', label: '≤' },
		{ value: 'between', label: 'between', range: true },
	],
	date: [
		{ value: 'equals', label: 'on' },
		{ value: 'before', label: 'before' },
		{ value: 'after', label: 'after' },
	],
	select: [
		{ value: 'equals', label: 'is' },
		{ value: 'notEquals', label: 'is not' },
	],
	boolean: [
		{ value: 'isTrue', label: 'is true', noValue: true },
		{ value: 'isFalse', label: 'is false', noValue: true },
	],
} satisfies Record<QueryFieldType, QueryOperator[]>

/** Resolves the operators available for a field: its explicit `operators`, else the defaults for its type. */
export function getOperators(field: QueryField): QueryOperator[] {
	return field.operators ?? defaultOperators[field.type] ?? []
}

/** Returns true when the group (or any nested group) contains at least one rule. */
export function hasRules(group: QueryGroup): boolean {
	return group.children.some((child) => (child.type === 'rule' ? true : hasRules(child)))
}

/**
 * Whether a value counts as filled for an operator that needs one. Nullish,
 * blank or whitespace-only strings, and empty arrays read as empty.
 *
 * @internal
 */
function isEmptyValue(value: unknown): boolean {
	if (value == null) return true

	if (typeof value === 'string') return value.trim() === ''

	// A range tuple is empty only when every bound is — an open-ended range with
	// one bound set still constrains rows.
	if (Array.isArray(value)) return value.every((item) => isEmptyValue(item))

	return false
}

/**
 * Whether a rule constrains its result: a value-less operator (`is empty`,
 * `is true`) always does; any other operator needs a non-empty value. The
 * operator's `noValue` flag is resolved from the rule's field.
 *
 * @internal
 */
function isRuleActive(rule: QueryRule, fields: QueryField[]): boolean {
	const field = fields.find((candidate) => candidate.name === rule.field)

	const operator = field && getOperators(field).find((option) => option.value === rule.operator)

	if (operator?.noValue) return true

	return !isEmptyValue(rule.value)
}

/**
 * Whether a query would actually constrain its result: true when any rule (at
 * any depth) carries a non-empty value or uses a value-less operator (`is
 * empty`, `is true`, …). A tree of only blank rules — what a freshly seeded or
 * fully cleared builder leaves behind — reads as inactive, so a filter
 * affordance can reflect a real constraint rather than the mere presence of a
 * rule.
 *
 * @param group - The query group (typically the root) to test.
 * @param fields - Field definitions resolving each rule's operator set.
 */
export function isQueryActive(group: QueryGroup, fields: QueryField[]): boolean {
	return group.children.some((child) =>
		child.type === 'group' ? isQueryActive(child, fields) : isRuleActive(child, fields),
	)
}

/**
 * Applies a transform to the node matching `id`, walking recursively.
 *
 * Returns the same `tree` reference when `id` is not found, keeping
 * unrelated subtrees referentially equal for memoized descendants.
 */
export function mapNode(
	tree: QueryGroup,
	id: string,
	fn: (node: QueryNode) => QueryNode,
): QueryGroup {
	if (tree.id === id) return fn(tree) as QueryGroup

	const { children } = tree

	for (const [i, child] of children.entries()) {
		let nextChild: QueryNode | undefined

		if (child.id === id) {
			nextChild = fn(child)
		} else if (child.type === 'group') {
			const mapped = mapNode(child, id, fn)

			if (mapped !== child) nextChild = mapped
		}

		if (nextChild !== undefined) {
			const nextChildren = children.slice()

			nextChildren[i] = nextChild

			return { ...tree, children: nextChildren }
		}
	}

	return tree
}

/**
 * Returns a new tree with `node` appended to the group identified by
 * `parentId`. Returns the same `tree` reference when `parentId` is not found,
 * keeping unrelated subtrees referentially equal for memoized descendants.
 */
export function addChild(tree: QueryGroup, parentId: string, node: QueryNode): QueryGroup {
	if (tree.id === parentId) return { ...tree, children: [...tree.children, node] }

	const { children } = tree

	for (const [i, child] of children.entries()) {
		if (child.type !== 'group') continue

		const mapped = addChild(child, parentId, node)

		if (mapped !== child) {
			const nextChildren = children.slice()

			nextChildren[i] = mapped

			return { ...tree, children: nextChildren }
		}
	}

	return tree
}

/**
 * Returns a new tree with the node identified by `id` removed, searching
 * recursively. Returns the same `tree` reference when `id` is not found,
 * keeping unrelated subtrees referentially equal for memoized descendants.
 */
export function removeChild(tree: QueryGroup, id: string): QueryGroup {
	const { children } = tree

	for (const [i, child] of children.entries()) {
		if (child.id === id) {
			const nextChildren = children.slice()

			nextChildren.splice(i, 1)

			return { ...tree, children: nextChildren }
		}

		if (child.type === 'group') {
			const mapped = removeChild(child, id)

			if (mapped !== child) {
				const nextChildren = children.slice()

				nextChildren[i] = mapped

				return { ...tree, children: nextChildren }
			}
		}
	}

	return tree
}

/**
 * A place focus can be sent: a node's own control (`node`, e.g. its remove
 * button) or a group's "add rule" control (`add`).
 */
export type FocusTarget = { kind: 'node'; id: string } | { kind: 'add'; groupId: string }

/**
 * Ordered focus candidates for the neighbourhood around node `id`, used when
 * removal takes `id` out of the tree; focus then moves to a neighbour instead
 * of dropping to <body> (WCAG 2.4.3).
 *
 * Returns several candidates, best first, and leaves the choice to the
 * caller, which focuses the first that resolves to a live element. A
 * disabled, unmounted, or otherwise unfocusable target degrades to the next
 * one. The ladder follows the APG list pattern: previous sibling, then next
 * sibling, then the enclosing group's add control, then the same for each
 * ancestor on the way to the root. Empty when `id` isn't found.
 */
export function findFocusTarget(tree: QueryGroup, id: string): FocusTarget[] {
	const index = tree.children.findIndex((child) => child.id === id)

	if (index !== -1) {
		const candidates: FocusTarget[] = []

		const prev = tree.children[index - 1]
		const next = tree.children[index + 1]

		if (prev) candidates.push({ kind: 'node', id: prev.id })

		if (next) candidates.push({ kind: 'node', id: next.id })

		candidates.push({ kind: 'add', groupId: tree.id })

		return candidates
	}

	for (const child of tree.children) {
		if (child.type === 'group') {
			const inner = findFocusTarget(child, id)

			// Found inside a nested group: this group's add control (and, by
			// recursion, its ancestors') follows the nested options.
			if (inner.length > 0) return [...inner, { kind: 'add', groupId: tree.id }]
		}
	}

	return []
}

/**
 * Stable string keys under which focusable controls register themselves,
 * matching a `FocusTarget` to a live element without touching the DOM.
 */
export const focusKeys = {
	node: (id: string) => `node:${id}`,
	add: (groupId: string) => `add:${groupId}`,
}

export function focusKeyOf(target: FocusTarget): string {
	return target.kind === 'node' ? focusKeys.node(target.id) : focusKeys.add(target.groupId)
}
