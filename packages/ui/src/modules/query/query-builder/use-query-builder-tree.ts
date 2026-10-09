'use client'

import { useMemo } from 'react'
import { useStableEvent } from '../../../hooks/use-stable-event'
import type { QueryGroup } from '../engine/types'
import { useQueryRemovalFocus } from '../use-query-removal-focus'
import { type QueryTreeOptions, useQueryTree } from '../use-query-tree'
import type { FocusRegister, QueryBuilderActions } from './context'
import { findFocusTarget, focusKeyOf } from './query-builder-focus'

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

	// Each remove or add control registers its element by key. A removal gives
	// the ordered candidates, and focus moves to the first live one once the
	// removed node unmounts.
	const { register, focusFirst } = useQueryRemovalFocus<HTMLElement>()

	// The wrapped `remove` keeps its identity, and it reads the newest tree to
	// find where focus lands after a node goes.
	const remove = useStableEvent((id: string) => {
		// Resolves focus candidates from the pre-removal tree; the effect moves
		// focus once the node has unmounted.
		const targets = findFocusTarget(root, id)

		actions.remove(id)

		if (targets.length > 0) focusFirst(targets.map(focusKeyOf))
	})

	const builderActions = useMemo<QueryBuilderActions>(
		() => ({ ...actions, remove }),
		[actions, remove],
	)

	return { root, actions: builderActions, register }
}
