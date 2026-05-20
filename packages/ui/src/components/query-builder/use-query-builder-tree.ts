import { useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks'
import type { QueryBuilderActions } from './context'
import { addChild, createGroup, createRule, mapNode, removeChild } from './query-builder-utilities'
import type { QueryField, QueryGroup } from './types'

export type UseQueryBuilderTreeOptions = {
	fields: QueryField[]
	value?: QueryGroup
	defaultValue?: QueryGroup
	onValueChange?: (value: QueryGroup) => void
}

export type UseQueryBuilderTreeResult = {
	root: QueryGroup
	actions: QueryBuilderActions
}

export function useQueryBuilderTree({
	fields,
	value,
	defaultValue,
	onValueChange,
}: UseQueryBuilderTreeOptions): UseQueryBuilderTreeResult {
	const initial = useMemo(() => defaultValue ?? createGroup('and'), [defaultValue])

	const [tree, setTree] = useControllable<QueryGroup>({
		value,
		defaultValue: initial,
		onValueChange: onValueChange && ((v) => v !== undefined && onValueChange(v)),
	})

	const root = tree ?? initial

	const updateRule = useCallback<QueryBuilderActions['updateRule']>(
		(id, patch) => {
			setTree((prev) =>
				mapNode(prev ?? initial, id, (node) =>
					node.type === 'rule' ? { ...node, ...patch, type: 'rule' as const } : node,
				),
			)
		},
		[setTree, initial],
	)

	const updateCombinator = useCallback<QueryBuilderActions['updateCombinator']>(
		(id, combinator) => {
			setTree((prev) => mapNode(prev ?? initial, id, (node) => ({ ...node, combinator })))
		},
		[setTree, initial],
	)

	const addRule = useCallback(
		(groupId: string) => {
			setTree((prev) => addChild(prev ?? initial, groupId, createRule(fields[0])))
		},
		[setTree, initial, fields],
	)

	const addGroup = useCallback(
		(groupId: string) => {
			setTree((prev) =>
				addChild(prev ?? initial, groupId, createGroup('and', [createRule(fields[0])])),
			)
		},
		[setTree, initial, fields],
	)

	const remove = useCallback(
		(id: string) => {
			setTree((prev) => removeChild(prev ?? initial, id))
		},
		[setTree, initial],
	)

	const actions = useMemo<QueryBuilderActions>(
		() => ({ updateRule, updateCombinator, addRule, addGroup, remove }),
		[updateRule, updateCombinator, addRule, addGroup, remove],
	)

	return { root, actions }
}
