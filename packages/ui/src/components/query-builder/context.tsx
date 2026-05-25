'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import type { QueryCombinator, QueryField, QueryGroup, QueryRule } from './types'

export type QueryBuilderStateValue = {
	fields: QueryField[]
	getField: (name: string) => QueryField | undefined
	disabled: boolean
}

export type QueryBuilderActions = {
	updateRule: (id: string, patch: Partial<QueryRule>) => void
	updateCombinator: (id: string, combinator: QueryCombinator) => void
	addRule: (groupId: string) => void
	addGroup: (groupId: string) => void
	remove: (id: string) => void
}

/** Combined shape for consumers that need state + actions + the current tree. */
export type QueryBuilderContextValue = QueryBuilderStateValue &
	QueryBuilderActions & { root: QueryGroup }

// Config (state) is stable across tree edits; actions are stable; the tree
// lives in its own narrow context so rule/group consumers that only depend
// on configuration skip re-renders when a sibling rule is edited.

const [QueryBuilderStateContext, useQueryBuilderState] =
	createContext<QueryBuilderStateValue>('QueryBuilderState')

const [QueryBuilderActionsContext, useQueryBuilderActions] =
	createContext<QueryBuilderActions>('QueryBuilderActions')

const [QueryBuilderRootContext, useQueryBuilderRoot] = createContext<QueryGroup>('QueryBuilderRoot')

export { useQueryBuilderActions, useQueryBuilderState }

/** Internal — the component-level provider wires all three contexts. */
export function QueryBuilderProvider({
	state,
	actions,
	root,
	children,
}: {
	state: QueryBuilderStateValue
	actions: QueryBuilderActions
	root: QueryGroup
	children: ReactNode
}) {
	return (
		<QueryBuilderActionsContext value={actions}>
			<QueryBuilderStateContext value={state}>
				<QueryBuilderRootContext value={root}>{children}</QueryBuilderRootContext>
			</QueryBuilderStateContext>
		</QueryBuilderActionsContext>
	)
}

/**
 * Returns combined state + actions + the current tree.
 *
 * Re-renders on every edit because the tree changes. Prefer
 * `useQueryBuilderActions` or `useQueryBuilderState` when you don't need the
 * tree itself.
 */
export function useQueryBuilderContext(): QueryBuilderContextValue {
	const state = useQueryBuilderState()
	const actions = useQueryBuilderActions()
	const root = useQueryBuilderRoot()

	return { ...state, ...actions, root }
}
