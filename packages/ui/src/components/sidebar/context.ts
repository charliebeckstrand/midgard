'use client'

import { createContext } from '../../core'

/**
 * True when items render inside a `SidebarList`, so each `SidebarItem` becomes
 * an `<li>` (a valid child of the list's `<ul>`) instead of a bare `<span>`.
 */
export const [SidebarListContext, useInSidebarList] = createContext<boolean>('SidebarList', {
	default: false,
})
