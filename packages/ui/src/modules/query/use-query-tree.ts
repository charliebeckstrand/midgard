'use client'

import { useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks'
import { createGroup, createRule } from './engine/query-node'
import { addChild, mapNode, removeChild } from './engine/query-tree'
import type { QueryCombinator, QueryField, QueryGroup, QueryRule } from './engine/types'

/** Tree-edit actions over a query root; each is referentially stable across edits. */
export type QueryTreeActions = {
	updateRule: (id: string, patch: Partial<QueryRule>) => void
	updateCombinator: (id: string, combinator: QueryCombinator) => void
	addRule: (groupId: string) => void
	addGroup: (groupId: string) => void
	remove: (id: string) => void
}

/** Options for {@link useQueryTree}: the queryable `fields` and the controlled/uncontrolled root. */
export type QueryTreeOptions = {
	/** Seeds a new rule's field when a rule is added. */
	fields: QueryField[]
	value?: QueryGroup
	defaultValue?: QueryGroup
	onValueChange?: (value: QueryGroup) => void
}

/** The current query `root` and the stable {@link QueryTreeActions} that edit it. */
export type QueryTreeResult = {
	root: QueryGroup
	actions: QueryTreeActions
}

/**
 * Headless query-tree state: holds a controlled or uncontrolled query root and
 * exposes immutable tree edits (add/update/remove) as referentially-stable
 * actions. The view layer wires these to controls; {@link useQueryBuilderTree}
 * composes this with the builder's focus management.
 */
export function useQueryTree({
	fields,
	value,
	defaultValue,
	onValueChange,
}: QueryTreeOptions): QueryTreeResult {
	const initial = useMemo(() => defaultValue ?? createGroup('and'), [defaultValue])

	const [tree, setTree] = useControllable<QueryGroup>({
		value,
		defaultValue: initial,
		onValueChange: onValueChange && ((v) => v !== undefined && onValueChange(v)),
	})

	const root = tree ?? initial

	const updateRule = useCallback<QueryTreeActions['updateRule']>(
		(id, patch) => {
			setTree((prev) =>
				mapNode(prev ?? initial, id, (node) =>
					node.type === 'rule' ? { ...node, ...patch, type: 'rule' as const } : node,
				),
			)
		},
		[setTree, initial],
	)

	const updateCombinator = useCallback<QueryTreeActions['updateCombinator']>(
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

	const actions = useMemo<QueryTreeActions>(
		() => ({ updateRule, updateCombinator, addRule, addGroup, remove }),
		[updateRule, updateCombinator, addRule, addGroup, remove],
	)

	return { root, actions }
}
