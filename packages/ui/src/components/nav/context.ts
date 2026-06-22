'use client'

import { createContext } from '../../core'
import { CurrentContext, type CurrentContextValue, useCurrent } from '../../primitives/current'

/** Value broadcast by {@link NavContext}: the active `value` and its change callback. */
export type NavContextValue = CurrentContextValue

/** Context carrying the {@link Nav} selection state to descendant items. */
export const NavContext = CurrentContext

/** Reads the enclosing {@link Nav} selection state ({@link NavContextValue}). */
export function useNavContext() {
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
