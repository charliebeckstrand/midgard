'use client'

import { type ReactNode, type RefCallback, use } from 'react'
import { createContext } from '../../core/create-context'
import type { OffcanvasLayout } from '../../hooks/use-offcanvas'
import type { Responsive } from '../../utilities/responsive'
import type { StickyBars } from './use-sticky-bars'

export const [SidebarLayoutContext] = createContext<{
	actions?: ReactNode
	bar?: StickyBars['bar']
	layout: Responsive<OffcanvasLayout>
	stickyHeader: boolean
	/**
	 * The target of the skip link: the id and the ref of the main slot. `null`
	 * when the layout renders no skip link, as inside the main slot of another
	 * layout.
	 */
	skip: { id: string; target: RefCallback<HTMLElement> } | null
} | null>('SidebarLayout', {
	default: null,
})

/**
 * The `layout` of the enclosing {@link SidebarLayout}, or `null` outside one.
 * A part that shows only beside the inline panel, such as the Sidebar picker
 * of `AppearanceSettings` or the Pin of the events, resolves its classes from
 * it, so it shows at the same breakpoints as the panel.
 *
 * @internal
 */
export function useSidebarLayoutPlacement(): Responsive<OffcanvasLayout> | null {
	return use(SidebarLayoutContext)?.layout ?? null
}
