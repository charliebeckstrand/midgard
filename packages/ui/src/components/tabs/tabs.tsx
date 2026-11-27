'use client'

import { type ComponentProps, useId, useMemo, useState } from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { CurrentContext, CurrentStoreContext } from '../../primitives/current/context'
import { useCurrentState } from '../../primitives/current/use-current-state'
import { useCurrentStore } from '../../primitives/current/use-current-store'
import { k, type scale } from '../../recipes/kata/tabs'
import { Box } from '../../structure/box'
import {
	TabsActivationContext,
	TabsContext,
	type TabsOrientation,
	type TabsVariant,
	useTabsActivation,
} from './context'
import { createTabsPanels } from './use-tabs-panels'

/** Props for {@link Tabs}: selection state, the `variant`/`orientation` context broadcast to its list and panels, and the `size` scope, plus native `<div>` attributes (less `defaultValue`). */
export type TabsProps = Omit<ComponentProps<'div'>, 'defaultValue'> & {
	/**
	 * The `value` of the current tab, for a controlled group. Set `null` to keep
	 * the group controlled with no tab current.
	 */
	value?: string | null
	/** The `value` of the initial current tab, for an uncontrolled group. */
	defaultValue?: string
	/** Fires when the user selects a tab, with the `value` of that tab. */
	onValueChange?: (value: string | null) => void
	/**
	 * The look of the group: underlined `tab` triggers or a segmented control.
	 * @defaultValue 'tab'
	 */
	variant?: TabsVariant
	/**
	 * Tab-list flow axis; the `segment` variant forces `horizontal`.
	 * @defaultValue 'horizontal'
	 */
	orientation?: TabsOrientation
	/**
	 * The density step of the tab text and the tab padding. Omit it to take the
	 * step of the nearest density scope. A step makes the group a density scope.
	 */
	size?: ScaleStep<typeof scale>
}

/**
 * A set of tabs, each with its own panel. It holds the selection state and the
 * `variant` and `orientation` context of its list and panels. Controlled or
 * uncontrolled via `value`/`defaultValue`; the `segment` variant forces
 * horizontal orientation. An explicit `size` makes the group a density scope.
 *
 * A `segment` group with no `TabContents` and no `TabContent` picks a value and
 * shows no panel. Its list is then a `radiogroup`, and each item is a `radio`
 * with `aria-checked`. An arrow key moves the focus and selects the item, as in
 * a group of native radios. A group with panels keeps the tab roles. The
 * server and the first client render do not know of the panels, so they render
 * the radio roles. The tab roles follow when a panel registers. A `Segment`
 * with `activation="manual"` keeps the tab roles.
 */
export function Tabs({
	value,
	defaultValue,
	onValueChange,
	variant = 'tab',
	orientation = 'horizontal',
	size,
	className,
	children,
	...props
}: TabsProps) {
	const context = useCurrentState({ value, defaultValue, onValueChange })

	const activation = useTabsActivation()

	// Each item reads its own value from the store, so a change renders only the
	// item that stops being current and the item that becomes current.
	const store = useCurrentStore(context)

	// Vertical only applies to the 'tab' variant; segment is always horizontal.
	const resolvedOrientation: TabsOrientation = variant === 'segment' ? 'horizontal' : orientation

	const baseId = useId()

	// The registered panels. A store, so a registration after the mount does not
	// change the context value (`use-tabs-panels.ts`).
	const [panels] = useState(createTabsPanels)

	const tabsContext = useMemo(
		() => ({ variant, orientation: resolvedOrientation, baseId, panels, activation }),
		[variant, resolvedOrientation, baseId, panels, activation],
	)

	return (
		<CurrentContext value={context}>
			<CurrentStoreContext value={store}>
				<TabsContext value={tabsContext}>
					<Box
						data-slot="tab-group"
						data-orientation={resolvedOrientation}
						density={size}
						className={cn(k({ orientation: resolvedOrientation }).base, className)}
						{...props}
					>
						{/* The activation of a Segment is for its own group only. */}
						<TabsActivationContext value="automatic">{children}</TabsActivationContext>
					</Box>
				</TabsContext>
			</CurrentStoreContext>
		</CurrentContext>
	)
}
