'use client'

import { Tabs, type TabsProps } from '../tabs'
import { TabsActivationContext } from '../tabs/context'

/**
 * Props for {@link Segment}: {@link TabsProps} without `variant` or
 * `orientation`, and `activation`. The segment variant pins orientation to
 * horizontal, so neither is part of the surface.
 */
export type SegmentProps = Omit<TabsProps, 'variant' | 'orientation'> & {
	/**
	 * How a `Segment` with no panels selects an item. With `automatic`, the
	 * group is a radio group, and an arrow key moves the focus and selects the
	 * item. With `manual`, the group keeps the tab roles: an arrow key moves only
	 * the focus, and Enter or Space selects the item. Use `manual` when a pick
	 * shows a different view or writes the address, so that each arrow key does
	 * not load a view. A `Segment` with panels always keeps the tab roles.
	 * @defaultValue 'automatic'
	 */
	activation?: 'automatic' | 'manual'
}

/**
 * A segmented control that selects one option in a horizontal row. It is a
 * preset over `<Tabs variant="segment">` with orientation pinned to horizontal.
 *
 * A `Segment` with no `TabContents` and no `TabContent` picks a value, so its
 * list is a `radiogroup` of `radio` items, and an arrow key moves the focus and
 * selects the item. A `Segment` with panels, or with `activation="manual"`,
 * keeps the tab roles.
 */
export function Segment({ activation = 'automatic', ...props }: SegmentProps) {
	return (
		<TabsActivationContext value={activation}>
			<Tabs data-slot="segment" variant="segment" {...props} />
		</TabsActivationContext>
	)
}
