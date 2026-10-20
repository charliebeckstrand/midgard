'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { useOptionalResizable, useResizableIndex } from './context'

/** The size weight of a panel that gives no `defaultSize`. @internal */
export const DEFAULT_PANEL_SIZE = 50

/**
 * Props for {@link ResizablePanel}: an initial size weight, and min/max bounds
 * as percentages of the group. The root `<div>` takes the rest. Inside a group,
 * the panel sets its own `id`, which the handle after it names.
 */
export type ResizablePanelProps = ComponentProps<'div'> & {
	/**
	 * Initial size as a weight. The group divides 100% in the ratio of the
	 * weights of its panels, so `30` and `50` give 37.5% and 62.5%. Weights that
	 * sum to 100 are percentages. Then each panel goes into its `minSize` and
	 * `maxSize`, and a neighbor panel takes the difference. When a panel at a
	 * bound stops the neighbor from taking the difference, the panels with
	 * slack share it in proportion to their weights. When no layout meets every
	 * bound, the sizes still sum to 100%, and one or more panels are not in
	 * their bounds.
	 * @defaultValue 50
	 */
	defaultSize?: number
	/**
	 * The smallest size of the panel, as a percentage of the group.
	 * @defaultValue 0
	 */
	minSize?: number
	/**
	 * The largest size of the panel, as a percentage of the group.
	 * @defaultValue 100
	 */
	maxSize?: number
}

/**
 * A flexible region within a {@link ResizableGroup}, flexing to its
 * context-tracked size (or `defaultSize` outside a group). The group reads
 * `defaultSize`/`minSize`/`maxSize` from these props to seed and bound resizing.
 */
export function ResizablePanel(props: ResizablePanelProps) {
	const {
		defaultSize = DEFAULT_PANEL_SIZE,
		minSize: _minSize,
		maxSize: _maxSize,
		className,
		style,
		children,
		...rest
	} = props

	const group = useOptionalResizable()

	const { panelIndex } = useResizableIndex()

	const size =
		group && panelIndex !== undefined ? (group.sizes[panelIndex] ?? defaultSize) : defaultSize

	return (
		<div
			data-slot="resizable-panel"
			{...rest}
			id={group && panelIndex !== undefined ? group.panelId(panelIndex) : rest.id}
			className={cn(k.panel, className)}
			style={{ ...style, flex: `${size} 0 0px` }}
		>
			{children}
		</div>
	)
}
