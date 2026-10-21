'use client'

import { createContext } from '../../core'

/**
 * True when items render inside a `SidebarList`. Each `SidebarItem` renders as
 * an `<li>` inside a list, or a `<div>` when standalone.
 */
export const [SidebarListContext, useInSidebarList] = createContext<boolean>('SidebarList', {
	default: false,
})

/**
 * True when the enclosing `Sidebar` renders in mini (icon rail) mode. The
 * collapse itself is CSS-driven; this context carries the intent so items can
 * mount their label tooltips. It is false in the drawer of a `SidebarLayout`,
 * where the sidebar keeps its full layout.
 */
export const [SidebarMiniContext, useSidebarMini] = createContext<boolean>('SidebarMini', {
	default: false,
})
