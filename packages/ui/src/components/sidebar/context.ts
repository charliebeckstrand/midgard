'use client'

import { createContext } from '../../core'

/**
 * True when items render inside a `SidebarList`. Each `SidebarItem` renders as
 * an `<li>` inside a list, or a `<span>` when standalone.
 */
export const [SidebarListContext, useInSidebarList] = createContext<boolean>('SidebarList', {
	default: false,
})
