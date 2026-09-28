'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStableEvent } from '../../../hooks/use-stable-event'
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
 * management. It wraps `remove` so removing a node moves focus to a surviving
 * neighbor (WCAG 2.4.3) rather than dropping to `<body>`. It also exposes the
 * `register` callback controls use to enroll their focusable elements.
 */
export function useQueryBuilderTree(options: QueryTreeOptions): QueryBuilderTreeResult {
	const { root, actions } = useQueryTree(options)

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

	// The wrapped `remove` keeps its identity, and it reads the newest tree to
	// find where focus lands after a node goes.
	const remove = useStableEvent((id: string) => {
		// Resolves focus candidates from the pre-removal tree; the effect moves
		// focus once the node has unmounted.
		const targets = findFocusTarget(root, id)

		actions.remove(id)

		if (targets.length > 0) setPendingFocus(targets)
	})

	const builderActions = useMemo<QueryBuilderActions>(
		() => ({ ...actions, remove }),
		[actions, remove],
	)

	return { root, actions: builderActions, register }
}
