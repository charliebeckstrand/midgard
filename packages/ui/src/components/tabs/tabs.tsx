'use client'

import { type ComponentProps, useCallback, useId, useMemo, useState } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { CurrentContext, useCurrentState } from '../../primitives/current'
import { CurrentStoreContext, useCurrentStore } from '../../primitives/current/current'
import { k } from '../../recipes/kata/tabs'
import { Box } from '../../structure/box'
import { TabsContext, type TabsOrientation, type TabsVariant } from './context'

/** Props for {@link Tabs}: selection state, the `variant`/`orientation` context broadcast to its list and panels, and the `size` scope. */
export type TabsProps = ComponentProps<'div'> & {
	value?: string | null
	defaultValue?: string
	onValueChange?: (value: string | null) => void
	/** @defaultValue 'tab' */
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
	size?: DensityStep
}

/**
 * Tab-group root holding selection state and `variant`/`orientation`
 * context for its list and panels. Controlled or uncontrolled via
 * `value`/`defaultValue`; the `segment` variant forces horizontal orientation.
 * An explicit `size` makes the group a density scope.
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

	// Each item reads its own value from the store, so a change renders only the
	// item that stops being current and the item that becomes current.
	const store = useCurrentStore(context)

	// Vertical only applies to the 'tab' variant; segment is always horizontal.
	const resolvedOrientation: TabsOrientation = variant === 'segment' ? 'horizontal' : orientation

	const baseId = useId()

	// Ref-count all-mounted TabContents (`mount="always"`, every inactive panel
	// held in the DOM) so inactive tabs keep aria-controls; a plain boolean would
	// be cleared by a second registrant unmounting while the first still holds
	// panels in the DOM.
	const [mountedPanelCount, setMountedPanelCount] = useState(0)

	const registerMountedPanels = useCallback(() => {
		setMountedPanelCount((count) => count + 1)

		return () => setMountedPanelCount((count) => count - 1)
	}, [])

	const panelsMounted = mountedPanelCount > 0

	const tabsContext = useMemo(
		() => ({
			variant,
			orientation: resolvedOrientation,
			baseId,
			panelsMounted,
			registerMountedPanels,
		}),
		[variant, resolvedOrientation, baseId, panelsMounted, registerMountedPanels],
	)

	return (
		<CurrentContext value={context}>
			<CurrentStoreContext value={store}>
				<TabsContext value={tabsContext}>
					<Box
						data-slot="tab-group"
						data-orientation={resolvedOrientation}
						density={size}
						className={cn(k.group({ orientation: resolvedOrientation }), className)}
						{...props}
					>
						{children}
					</Box>
				</TabsContext>
			</CurrentStoreContext>
		</CurrentContext>
	)
}
