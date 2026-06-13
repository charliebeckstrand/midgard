'use client'

import { CurrentContext, type CurrentContextValue, useCurrent } from '../../primitives/current'

/** Value broadcast by {@link NavContext}: the active `value` and its change callback. */
export type NavContextValue = CurrentContextValue

/** Context carrying the {@link Nav} selection state to descendant items. */
export const NavContext = CurrentContext

/** Reads the enclosing {@link Nav} selection state ({@link NavContextValue}). */
export function useNavContext() {
	return useCurrent()
}
