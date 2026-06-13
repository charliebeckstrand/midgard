'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { useResizable, useResizableIndex } from './context'

/** Props for {@link ResizablePanel}: initial size and min/max bounds as percentages of the group. */
export type ResizablePanelProps = {
	/**
	 * Initial size as a percentage of the group.
	 * @defaultValue 50
	 */
	defaultSize?: number
	/** @defaultValue 0 */
	minSize?: number
	/** @defaultValue 100 */
	maxSize?: number
	className?: string
	children?: ReactNode
}

/**
 * A flexible region within a {@link ResizableGroup}, flexing to its
 * context-tracked size (or `defaultSize` outside a group). The group reads
 * `defaultSize`/`minSize`/`maxSize` from these props to seed and bound resizing.
 */
export function ResizablePanel(props: ResizablePanelProps) {
	const { defaultSize = 50, className, children } = props

	const { sizes } = useResizable()

	const { panelIndex } = useResizableIndex()

	const size = panelIndex !== undefined ? (sizes[panelIndex] ?? defaultSize) : defaultSize

	return (
		<div
			data-slot="resizable-panel"
			className={cn(k.panel, className)}
			style={{ flex: `${size} 0 0px` }}
		>
			{children}
		</div>
	)
}
