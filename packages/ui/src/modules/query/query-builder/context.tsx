'use client'

import { type ReactNode, useCallback, useSyncExternalStore } from 'react'
import { createContext } from '../../../core/create-context'
import type { Orientation } from '../../../types/orientation'
import type { Responsive } from '../../../utilities/responsive'
import type { QueryField } from '../engine/types'
import type { QueryTreeActions } from '../use-query-tree'
import type { QueryMove } from './query-builder-move'

/** Registers (or, with `null`, unregisters) a focusable control under `key`. @internal */
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
	/** When true, each node that can move shows a drag grip, and a node moves among its siblings and into other groups. @defaultValue false */
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

// The move of a node from one group into another: the drop of a pointer drag
// and the node that a keyboard move carries.
const [QueryBuilderMoveContext, useQueryBuilderMove] = createContext<QueryMove>('QueryBuilderMove')

export { useQueryBuilderActions, useQueryBuilderMove, useQueryBuilderState }

/**
 * The index that a pointer drag from another group drops a node at in the
 * group, or `null` while no drag drops into the group. Only the group that the
 * drop enters or leaves renders again.
 *
 * @internal
 */
export function useDropIndex(groupId: string): number | null {
	const { subscribe, getDrop } = useQueryBuilderMove()

	return useSyncExternalStore(
		subscribe,
		() => {
			const drop = getDrop()

			return drop?.groupId === groupId ? drop.index : null
		},
		() => null,
	)
}

/**
 * Callback ref that registers the element under `key` for the lifetime it's
 * mounted. Memoized on `key`; the ref identity stays stable across renders.
 *
 * @internal
 */
export function useFocusableRef(key: string) {
	const register = useQueryBuilderFocus()

	return useCallback((el: HTMLElement | null) => register(key, el), [register, key])
}

/** The component-level provider wires the four contexts. @internal */
export function QueryBuilderProvider({
	state,
	actions,
	register,
	move,
	children,
}: {
	state: QueryBuilderStateValue
	actions: QueryBuilderActions
	register: FocusRegister
	move: QueryMove
	children: ReactNode
}) {
	return (
		<QueryBuilderActionsContext value={actions}>
			<QueryBuilderStateContext value={state}>
				<QueryBuilderFocusContext value={register}>
					<QueryBuilderMoveContext value={move}>{children}</QueryBuilderMoveContext>
				</QueryBuilderFocusContext>
			</QueryBuilderStateContext>
		</QueryBuilderActionsContext>
	)
}
