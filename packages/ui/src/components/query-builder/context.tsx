'use client'

import { type ReactNode, useCallback } from 'react'
import { createContext } from '../../core'
import type { QueryCombinator, QueryField, QueryGroup, QueryRule } from './types'

/** Registers (or, with `null`, unregisters) a focusable control under `key`. */
export type FocusRegister = (key: string, el: HTMLElement | null) => void

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

// Config (state) and actions are stable across tree edits. The tree lives in
// its own narrow context; rule/group consumers that read only configuration
// are unaffected by sibling rule edits.

const [QueryBuilderStateContext, useQueryBuilderState] =
	createContext<QueryBuilderStateValue>('QueryBuilderState')

const [QueryBuilderActionsContext, useQueryBuilderActions] =
	createContext<QueryBuilderActions>('QueryBuilderActions')

const [QueryBuilderRootContext, useQueryBuilderRoot] = createContext<QueryGroup>('QueryBuilderRoot')

// Focus registry: rules/groups register their remove (and add) controls by key;
// removal uses the registry to move focus to a surviving neighbour.
const [QueryBuilderFocusContext, useQueryBuilderFocus] =
	createContext<FocusRegister>('QueryBuilderFocus')

export { useQueryBuilderActions, useQueryBuilderState }

/**
 * Callback ref that registers the element under `key` for the lifetime it's
 * mounted. Memoized on `key`; the ref identity stays stable across renders.
 */
export function useFocusableRef(key: string) {
	const register = useQueryBuilderFocus()

	return useCallback((el: HTMLElement | null) => register(key, el), [register, key])
}

/** Internal: the component-level provider wires the four contexts. */
export function QueryBuilderProvider({
	state,
	actions,
	root,
	register,
	children,
}: {
	state: QueryBuilderStateValue
	actions: QueryBuilderActions
	root: QueryGroup
	register: FocusRegister
	children: ReactNode
}) {
	return (
		<QueryBuilderActionsContext value={actions}>
			<QueryBuilderStateContext value={state}>
				<QueryBuilderFocusContext value={register}>
					<QueryBuilderRootContext value={root}>{children}</QueryBuilderRootContext>
				</QueryBuilderFocusContext>
			</QueryBuilderStateContext>
		</QueryBuilderActionsContext>
	)
}

/**
 * Returns combined state + actions + the current tree.
 *
 * Re-renders on every edit; the tree changes each time. Prefer
 * `useQueryBuilderActions` or `useQueryBuilderState` when you don't need the
 * tree itself.
 */
export function useQueryBuilderContext(): QueryBuilderContextValue {
	const state = useQueryBuilderState()
	const actions = useQueryBuilderActions()
	const root = useQueryBuilderRoot()

	return { ...state, ...actions, root }
}
