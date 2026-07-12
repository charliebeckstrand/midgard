'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QueryGroup } from '../engine/types'
import { type QueryTreeOptions, useQueryTree } from '../use-query-tree'
import type { FocusRegister, QueryBuilderActions } from './context'
import { type FocusTarget, findFocusTarget, focusKeyOf } from './query-builder-focus'

type QueryBuilderTreeResult = {
	root: QueryGroup
	actions: QueryBuilderActions
	register: FocusRegister
}

/**
 * Composes the headless {@link useQueryTree} with the builder's focus
 * management: it wraps `remove` so removing a node moves focus to a surviving
 * neighbour (WCAG 2.4.3) rather than dropping to `<body>`, and exposes the
 * `register` callback controls use to enrol their focusable elements.
 */
export function useQueryBuilderTree(options: QueryTreeOptions): QueryBuilderTreeResult {
	const { root, actions } = useQueryTree(options)

	// The wrapped `remove` is referentially stable and cannot close over the live
	// tree. A ref mirrors the latest root; the handler reads it to compute where
	// focus lands after a node disappears.
	const treeRef = useRef(root)

	treeRef.current = root

	// Focus registry: each remove/add control registers its element by key. A
	// removal stashes ordered focus candidates; the effect runs once the tree
	// has re-rendered (the removed node now unregistered) and moves focus to
	// the first surviving candidate, keeping focus off <body> (WCAG 2.4.3).
	const focusables = useRef(new Map<string, HTMLElement>())

	const register = useCallback<FocusRegister>((key, el) => {
		if (el) focusables.current.set(key, el)
		else focusables.current.delete(key)
	}, [])

	// Each removal sets a fresh candidate array; the effect runs only after a
	// removal commits (the removed node now unregistered), never on unrelated
	// re-renders. `pendingFocus` stays set: clearing it triggers an extra
	// render that remounts the newly focused control.
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

	const remove = useCallback<QueryBuilderActions['remove']>(
		(id) => {
			// Resolves focus candidates from the pre-removal tree; the effect moves
			// focus once the node has unmounted.
			const targets = findFocusTarget(treeRef.current, id)

			actions.remove(id)

			if (targets.length > 0) setPendingFocus(targets)
		},
		[actions],
	)

	const builderActions = useMemo<QueryBuilderActions>(
		() => ({ ...actions, remove }),
		[actions, remove],
	)

	return { root, actions: builderActions, register }
}
