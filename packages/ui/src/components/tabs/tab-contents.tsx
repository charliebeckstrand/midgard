'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { CurrentContent, CurrentContents } from '../../primitives/current'
import { useTabsContext } from './context'
import { useTabPanelTabIndex } from './use-tab-panel-tab-index'

export type TabContentsProps = Omit<ComponentPropsWithoutRef<typeof CurrentContents>, 'slotPrefix'>
export type TabContentProps = Omit<ComponentPropsWithoutRef<typeof CurrentContent>, 'slotPrefix'>

export function TabContents(props: TabContentsProps) {
	return <CurrentContents slotPrefix="tab" {...props} />
}

/**
 * Idiomatic tab panel — renders when its `value` matches the active tab. Inside
 * `<Tabs>` it auto-wires `role="tabpanel"`, the matching `aria-labelledby` →
 * tab, and a computed `tabIndex` (`0` when the panel has no focusable child,
 * keeping it keyboard-reachable per APG), pairing with its `Tab` via the Tabs
 * base id + value.
 */
export function TabContent({ value, ...props }: TabContentProps) {
	const tabsContext = useTabsContext()

	const { triggerId, panelId } = useA11yDisclosure({ id: tabsContext?.baseId, key: value })

	const auto = value !== undefined && tabsContext?.baseId !== undefined

	const ref = useRef<HTMLDivElement>(null)

	// `0` only when the panel has no focusable child (APG), keeping it
	// keyboard-reachable without a redundant tab stop.
	const tabIndex = useTabPanelTabIndex(ref)

	return (
		<CurrentContent
			ref={ref}
			slotPrefix="tab"
			value={value}
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
