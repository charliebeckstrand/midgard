'use client'

import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { CurrentContent, CurrentContents } from '../../primitives/current'
import { k } from '../../recipes/kata/tabs'
import { useTabsContext } from './context'
import { useTabPanelTabIndex } from './use-tab-panel-tab-index'

/** Props for {@link TabContents}; the `tab`-slotted `CurrentContents` surface. */
export type TabContentsProps = Omit<ComponentPropsWithoutRef<typeof CurrentContents>, 'slotPrefix'>
/** Props for {@link TabContent}; the `tab`-slotted `CurrentContent` surface. */
export type TabContentProps = Omit<ComponentPropsWithoutRef<typeof CurrentContent>, 'slotPrefix'>

/**
 * Container that swaps `<TabContent>` panels by active value. In `fade` mode
 * (the default) inactive panels stay mounted and the container registers that
 * with the Tabs context so every tab keeps its `aria-controls`; otherwise
 * inactive panels unmount.
 *
 * @remarks
 * `fade` defaults to `true`; set `fade={false}` to unmount inactive panels.
 */
export function TabContents({ fade = true, ...props }: TabContentsProps) {
	const tabsContext = useTabsContext()

	const registerMountedPanels = tabsContext?.registerMountedPanels

	// Fade mode keeps inactive panels mounted; registers that with the Tabs
	// context.
	useEffect(() => {
		if (!fade) return

		return registerMountedPanels?.()
	}, [fade, registerMountedPanels])

	return <CurrentContents slotPrefix="tab" fade={fade} {...props} />
}

/**
 * Idiomatic tab panel; renders when its `value` matches the active tab. Inside
 * `<Tabs>` it auto-wires `role="tabpanel"`, `aria-labelledby` to the matching
 * tab, and a computed `tabIndex` (`0` when the panel has no focusable child,
 * per APG), pairing with its `Tab` via the Tabs base id + value. A content-only
 * panel that becomes tab-focusable signals focus with the design-system blue
 * ring rather than the browser default.
 */
export function TabContent({ value, className, ...props }: TabContentProps) {
	const tabsContext = useTabsContext()

	const { triggerId, panelId } = useA11yDisclosure({ id: tabsContext?.baseId, key: value })

	const auto = value !== undefined && tabsContext?.baseId !== undefined

	const ref = useRef<HTMLDivElement>(null)

	// `0` only when the panel has no focusable child (APG).
	const tabIndex = useTabPanelTabIndex(ref)

	return (
		<CurrentContent
			ref={ref}
			slotPrefix="tab"
			value={value}
			className={cn(k.panel, className)}
			{...(auto && {
				role: 'tabpanel',
				id: panelId,
				'aria-labelledby': triggerId,
				tabIndex,
			})}
			{...props}
		/>
	)
}
