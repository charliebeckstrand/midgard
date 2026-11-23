'use client'

import { useMemo } from 'react'
import { useStableEvent } from '../../../hooks/use-stable-event'
import type { QueryGroup, QueryNode } from '../engine/types'
import { useQueryFocus } from '../use-query-focus'
import { type QueryTreeOptions, useQueryTree } from '../use-query-tree'
import type { FocusRegister, QueryBuilderActions } from './context'
import { findFocusTarget, focusKeys, getFocusKey } from './query-builder-focus'

type QueryBuilderTreeResult = {
	root: QueryGroup
	actions: QueryBuilderActions
	register: FocusRegister
}

/** The first rule of a new node: the node itself, or the first rule of a new group. */
function firstRule(node: QueryNode): QueryNode | undefined {
	if (node.type === 'rule') return node

	const [first] = node.children

	return first && firstRule(first)
}

/**
 * Composes the headless {@link useQueryTree} with the builder's focus
 * management. It wraps `remove` so removing a node moves focus to a surviving
 * neighbor (WCAG 2.4.3) rather than dropping to `<body>`. It wraps `addRule`
 * and `addGroup` so the first control of the new rule takes the focus, as the
 * new node renders above the Add trigger. It also exposes the `register`
 * callback controls use to enroll their focusable elements.
 *
 * @internal
 */
export function useQueryBuilderTree(options: QueryTreeOptions): QueryBuilderTreeResult {
	const { root, actions } = useQueryTree(options)

	// Each remove or add control, and the controls of each rule, register an
	// element by key. An edit gives the ordered candidates, and focus moves to
	// the first live one once the tree shows the edit.
	const { register, focusFirst, focusAdded } = useQueryFocus<HTMLElement>(root)

	// The wrapped `remove` keeps its identity, and it reads the newest tree to
	// find where focus lands after a node goes.
	const remove = useStableEvent((id: string) => {
		// Resolves focus candidates from the pre-removal tree; the effect moves
		// focus once the node has left the tree.
		const targets = findFocusTarget(root, id)

		actions.remove(id)

		if (targets.length > 0) focusFirst(id, targets.map(getFocusKey))
	})

	// The focus waits for the new node, because a controlled owner can apply
	// the add in a later update.
	const focusNew = (node: QueryNode) => {
		const rule = firstRule(node)

		if (rule) focusAdded(node.id, [focusKeys.entry(rule.id)])

		return node
	}

	const addRule = useStableEvent((groupId: string) => focusNew(actions.addRule(groupId)))

	const addGroup = useStableEvent((groupId: string) => focusNew(actions.addGroup(groupId)))

	const builderActions = useMemo<QueryBuilderActions>(
		() => ({ ...actions, remove, addRule, addGroup }),
		[actions, remove, addRule, addGroup],
	)

	return { root, actions: builderActions, register }
}
