'use client'

import { createContext, useContext } from 'react'
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

const QueryBuilderStateContext = createContext<QueryBuilderStateValue | null>(null)

const QueryBuilderActionsContext = createContext<QueryBuilderActions | null>(null)

const QueryBuilderRootContext = createContext<QueryGroup | null>(null)

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
	children: React.ReactNode
}) {
	return (
		<QueryBuilderActionsContext.Provider value={actions}>
			<QueryBuilderStateContext.Provider value={state}>
				<QueryBuilderRootContext.Provider value={root}>{children}</QueryBuilderRootContext.Provider>
			</QueryBuilderStateContext.Provider>
		</QueryBuilderActionsContext.Provider>
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
	const state = useContext(QueryBuilderStateContext)
	const actions = useContext(QueryBuilderActionsContext)
	const root = useContext(QueryBuilderRootContext)

	if (state === null || actions === null || root === null) {
		throw new Error('useQueryBuilderContext must be used within <QueryBuilder>')
	}

	return { ...state, ...actions, root }
}

/** Query-builder actions. Stable reference — consumers skip re-renders on tree edits. */
export function useQueryBuilderActions(): QueryBuilderActions {
	const actions = useContext(QueryBuilderActionsContext)

	if (actions === null) {
		throw new Error('useQueryBuilderActions must be used within <QueryBuilder>')
	}

	return actions
}

/**
 * Query-builder configuration (fields, getField, disabled). Stable across tree
 * edits — memoized consumers skip re-renders when an unrelated rule changes.
 */
export function useQueryBuilderState(): QueryBuilderStateValue {
	const state = useContext(QueryBuilderStateContext)

	if (state === null) {
		throw new Error('useQueryBuilderState must be used within <QueryBuilder>')
	}

	return state
}
