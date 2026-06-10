'use client'

import { createContext } from '../../core'

/**
 * True when items render inside a `SidebarList`. Each `SidebarItem` renders as
 * an `<li>` inside a list, or a `<span>` when standalone.
 */
export const [SidebarListContext, useInSidebarList] = createContext<boolean>('SidebarList', {
	default: false,
})

/**
 * True when the enclosing `Sidebar` renders in mini (icon rail) mode. The
 * collapse itself is CSS-driven and desktop-only; this context carries the
 * intent so items can mount their label tooltips.
 */
export const [SidebarMiniContext, useSidebarMini] = createContext<boolean>('SidebarMini', {
	default: false,
})
