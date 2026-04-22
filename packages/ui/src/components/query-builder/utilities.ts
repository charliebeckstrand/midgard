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

const DEFAULT_OPERATORS: Record<QueryFieldType, QueryOperator[]> = {
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
	return field.operators ?? DEFAULT_OPERATORS[field.type] ?? []
}

/** Returns true when the group (or any nested group) contains at least one rule. */
export function hasRules(group: QueryGroup): boolean {
	return group.children.some((child) => (child.type === 'rule' ? true : hasRules(child)))
}

// ── Immutable tree helpers ─────────────────────────────

/**
 * Apply a transform to the node matching `id`, walking recursively.
 *
 * Returns the same `tree` reference when `id` is not found — this keeps
 * unrelated subtrees referentially equal so memoized descendants can skip
 * re-renders.
 */
export function mapNode(
	tree: QueryGroup,
	id: string,
	fn: (node: QueryNode) => QueryNode,
): QueryGroup {
	if (tree.id === id) return fn(tree) as QueryGroup

	const { children } = tree

	for (let i = 0; i < children.length; i++) {
		const child = children[i] as QueryNode

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

	for (let i = 0; i < children.length; i++) {
		const child = children[i] as QueryNode

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

	for (let i = 0; i < children.length; i++) {
		const child = children[i] as QueryNode

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
