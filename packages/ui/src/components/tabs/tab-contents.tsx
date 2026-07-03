'use client'

import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { CurrentContent, CurrentContents, resolveMount } from '../../primitives/current'
import { k } from '../../recipes/kata/tabs'
import { useTabsContext } from './context'
import { useTabPanelTabIndex } from './use-tab-panel-tab-index'

/** Props for {@link TabContents}; the `tab`-slotted `CurrentContents` surface. */
export type TabContentsProps = Omit<ComponentPropsWithoutRef<typeof CurrentContents>, 'slotPrefix'>
/** Props for {@link TabContent}; the `tab`-slotted `CurrentContent` surface. */
export type TabContentProps = Omit<ComponentPropsWithoutRef<typeof CurrentContent>, 'slotPrefix'>

/**
 * Container that swaps `<TabContent>` panels by active value. Its `mount` policy
 * — resolved from `fade` when unset — decides whether inactive panels stay
 * mounted, mount lazily on first activation, or unmount. While every inactive
 * panel is guaranteed mounted (`mount="always"`), the container registers that
 * with the Tabs context so every tab keeps its `aria-controls`.
 *
 * @remarks
 * `fade` (default `true`) implies `mount="always"`; `fade={false}` implies
 * `mount="active"` (unmount), preserving pre-`mount` behavior. Set `mount`
 * explicitly to decouple the axes: `mount="lazy"` defers never-visited panels,
 * and `mount="always"` with `fade={false}` holds inactive panels via
 * `<Activity mode="hidden">` — mounted with state preserved but effects paused —
 * instead of the opacity cross-fade.
 */
export function TabContents({ fade = true, mount, ...props }: TabContentsProps) {
	const tabsContext = useTabsContext()

	const registerMountedPanels = tabsContext?.registerMountedPanels

	// `aria-controls` on an inactive tab only resolves when its panel is in the
	// DOM, which is guaranteed only when every inactive panel is held — mount
	// `always`. Register that with the Tabs context; `lazy`/`active` leave an
	// inactive tab without the reference until (or unless) its panel mounts.
	const allMounted = resolveMount(fade, mount) === 'always'

	useEffect(() => {
		if (!allMounted) return

		return registerMountedPanels?.()
	}, [allMounted, registerMountedPanels])

	return <CurrentContents slotPrefix="tab" fade={fade} mount={mount} {...props} />
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
