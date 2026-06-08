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

const defaultOperators: Record<QueryFieldType, QueryOperator[]> = {
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
}

export function getOperators(field: QueryField): QueryOperator[] {
	return field.operators ?? defaultOperators[field.type] ?? []
}

/** Returns true when the group (or any nested group) contains at least one rule. */
export function hasRules(group: QueryGroup): boolean {
	return group.children.some((child) => (child.type === 'rule' ? true : hasRules(child)))
}

/**
 * Apply a transform to the node matching `id`, walking recursively.
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
 * Ordered focus candidates for the neighbourhood around node `id` — used when
 * `id` is leaving the tree (removal) and focus must move somewhere sensible
 * rather than dropping to <body> (WCAG 2.4.3).
 *
 * Resolution is deliberately ambiguous: it returns *several* candidates, best
 * first, and leaves the choice to the caller, which focuses the first that
 * resolves to a live element. This way a disabled, unmounted, or otherwise
 * unfocusable target degrades to the next one. The ladder follows the APG
 * list pattern — previous sibling, then next sibling, then the enclosing
 * group's add control, then the same for each ancestor on the way to the root.
 * Empty when `id` isn't found.
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

			// Found inside a nested group — fall back to this group's add control
			// (and, by recursion, its ancestors') once the nested options run out.
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
