'use client'

import { createContext } from '../../core'
import { CurrentContext, type CurrentContextValue, useCurrent } from '../../primitives/current'

/**
 * Value broadcast by {@link NavContext}: the active `value` and its change
 * callback. `value` is `null` when the `Nav` is controlled with no item current.
 */
export type NavContextValue = CurrentContextValue

/** Context carrying the {@link Nav} selection state to descendant items. */
export const NavContext = CurrentContext

/**
 * Reads the enclosing {@link Nav} selection state ({@link NavContextValue}).
 *
 * @returns The selection state, or `undefined` outside a {@link Nav}.
 */
export function useNavContext(): NavContextValue | undefined {
	return useCurrent()
}

/**
 * Flags descendants that a {@link NavBar} encloses them; `useNavBar` reads it so
 * {@link NavList} can default to horizontal orientation. Cross-component within
 * `ui` (CONVENTIONS §3.5), not part of the public surface.
 *
 * @internal
 */
export const [NavBarContext, useNavBar] = createContext<boolean>('NavBar', { default: false })
