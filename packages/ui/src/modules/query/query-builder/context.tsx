'use client'

import { type ReactNode, useCallback } from 'react'
import { createContext } from '../../../core'
import type { Orientation, Responsive } from '../../../types'
import type { QueryField } from '../engine/types'
import type { QueryTreeActions } from '../use-query-tree'

/** Registers (or, with `null`, unregisters) a focusable control under `key`. */
export type FocusRegister = (key: string, el: HTMLElement | null) => void

/** Field configuration shared down the tree: the field list, a name lookup, and the disabled flag. Stable across tree edits. @internal */
export type QueryBuilderStateValue = {
	fields: QueryField[]
	getField: (name: string) => QueryField | undefined
	disabled: boolean
	/** When false, the "Add group" action is hidden so the query stays a flat rule list. @defaultValue true */
	allowGroups: boolean
	/** When true, rules omit their field selector: for a single fixed field. @defaultValue false */
	hideFieldSelector: boolean
	/** The axis of the parts of each rule, single or per breakpoint. */
	orientation: Responsive<Orientation>
	/** When true, the query keeps at least one rule: a group's last rule hides its remove control. @defaultValue false */
	requireRule: boolean
	/** When true, each group with more than one child shows a drag grip beside each child. @defaultValue false */
	reorderable: boolean
}

/** Tree-edit actions provided to rule/group consumers; referentially stable across edits. Aliases the headless {@link QueryTreeActions}. @internal */
export type QueryBuilderActions = QueryTreeActions

// Config (state) and actions are stable across tree edits, so a sibling rule
// edit does not render a consumer that reads only configuration.

const [QueryBuilderStateContext, useQueryBuilderState] =
	createContext<QueryBuilderStateValue>('QueryBuilderState')

const [QueryBuilderActionsContext, useQueryBuilderActions] =
	createContext<QueryBuilderActions>('QueryBuilderActions')

// Focus registry: rules/groups register their remove (and add) controls by key;
// removal uses the registry to move focus to a surviving neighbor.
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

/** Internal: the component-level provider wires the three contexts. */
export function QueryBuilderProvider({
	state,
	actions,
	register,
	children,
}: {
	state: QueryBuilderStateValue
	actions: QueryBuilderActions
	register: FocusRegister
	children: ReactNode
}) {
	return (
		<QueryBuilderActionsContext value={actions}>
			<QueryBuilderStateContext value={state}>
				<QueryBuilderFocusContext value={register}>{children}</QueryBuilderFocusContext>
			</QueryBuilderStateContext>
		</QueryBuilderActionsContext>
	)
}
