'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import type { FocusRegister, QueryBuilderActions } from './context'
import {
	addChild,
	createGroup,
	createRule,
	type FocusTarget,
	findFocusTarget,
	focusKeyOf,
	mapNode,
	removeChild,
} from './query-builder-utilities'
import type { QueryField, QueryGroup } from './types'

type QueryBuilderTreeOptions = {
	fields: QueryField[]
	value?: QueryGroup
	defaultValue?: QueryGroup
	onValueChange?: (value: QueryGroup) => void
}

type QueryBuilderTreeResult = {
	root: QueryGroup
	actions: QueryBuilderActions
	register: FocusRegister
}

export function useQueryBuilderTree({
	fields,
	value,
	defaultValue,
	onValueChange,
}: QueryBuilderTreeOptions): QueryBuilderTreeResult {
	const initial = useMemo(() => defaultValue ?? createGroup('and'), [defaultValue])

	const [tree, setTree] = useControllable<QueryGroup>({
		value,
		defaultValue: initial,
		onValueChange: onValueChange && ((v) => v !== undefined && onValueChange(v)),
	})

	const root = tree ?? initial

	// `remove` is kept referentially stable (so the actions context doesn't
	// churn on every edit), so it can't close over the live tree — mirror the
	// latest root into a ref the handler reads when computing where focus
	// should land after a node disappears.
	const treeRef = useRef(root)

	treeRef.current = root

	// Focus registry: each remove/add control registers its element by key. A
	// removal stashes its ordered focus candidates; the effect runs once the
	// tree has re-rendered (the removed node now unregistered) and moves focus
	// to the first surviving candidate, so it never falls to <body> (WCAG 2.4.3).
	const focusables = useRef(new Map<string, HTMLElement>())

	const register = useCallback<FocusRegister>((key, el) => {
		if (el) focusables.current.set(key, el)
		else focusables.current.delete(key)
	}, [])

	// Each removal sets a fresh candidate array, so the effect runs only after a
	// removal commits (the removed node now unregistered) — never on unrelated
	// re-renders. It deliberately leaves `pendingFocus` set: clearing it would
	// trigger an extra render that remounts the just-focused control and drops
	// focus back to <body>.
	const [pendingFocus, setPendingFocus] = useState<FocusTarget[] | null>(null)

	useEffect(() => {
		if (!pendingFocus) return

		for (const target of pendingFocus) {
			const el = focusables.current.get(focusKeyOf(target))

			if (el) {
				el.focus()

				return
			}
		}
	}, [pendingFocus])

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
			// Resolve focus candidates from the pre-removal tree; the effect above
			// moves focus once the node has unmounted.
			const targets = findFocusTarget(treeRef.current, id)

			setTree((prev) => removeChild(prev ?? initial, id))

			if (targets.length > 0) setPendingFocus(targets)
		},
		[setTree, initial],
	)

	const actions = useMemo<QueryBuilderActions>(
		() => ({ updateRule, updateCombinator, addRule, addGroup, remove }),
		[updateRule, updateCombinator, addRule, addGroup, remove],
	)

	return { root, actions, register }
}
