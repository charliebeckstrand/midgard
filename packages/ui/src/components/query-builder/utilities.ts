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

export function createRule(field?: QueryField): QueryRule {
	const operators = field ? getOperators(field) : []

	return {
		id: nextId(),
		type: 'rule',
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

// ── Immutable tree helpers ─────────────────────────────

/** Apply a transform to the node matching `id`, walking recursively. */
export function mapNode(
	tree: QueryGroup,
	id: string,
	fn: (node: QueryNode) => QueryNode,
): QueryGroup {
	if (tree.id === id) return fn(tree) as QueryGroup

	return {
		...tree,
		children: tree.children.map((child) => {
			if (child.id === id) return fn(child)

			if (child.type === 'group') return mapNode(child, id, fn)

			return child
		}),
	}
}

export function addChild(tree: QueryGroup, parentId: string, node: QueryNode): QueryGroup {
	if (tree.id === parentId) return { ...tree, children: [...tree.children, node] }

	return {
		...tree,
		children: tree.children.map((child) =>
			child.type === 'group' ? addChild(child, parentId, node) : child,
		),
	}
}

export function removeChild(tree: QueryGroup, id: string): QueryGroup {
	return {
		...tree,
		children: tree.children
			.filter((child) => child.id !== id)
			.map((child) => (child.type === 'group' ? removeChild(child, id) : child)),
	}
}
