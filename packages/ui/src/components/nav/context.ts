'use client'

import { createContext } from '../../core'

/**
 * Flags descendants that a {@link NavBar} encloses them; `useNavBar` reads it so
 * {@link NavList} can default to horizontal orientation. Cross-component within
 * `ui` (CONVENTIONS §3.5), not part of the public surface.
 *
 * @internal
 */
export const [NavBarContext, useNavBar] = createContext<boolean>('NavBar', { default: false })
