'use client'

import { Children, isValidElement, type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { ResizableContext, ResizableIndexContext } from './context'
import { ResizableHandle } from './resizable-handle'
import { ResizablePanel, type ResizablePanelProps } from './resizable-panel'
import type { PanelConfig, ResizableOrientation } from './types'
import { useResizablePanel } from './use-resizable-panel'

/** Props for {@link ResizableGroup}: layout `orientation`, a size-change callback, and the drag bracket. */
export type ResizableGroupProps = {
	/** @defaultValue 'horizontal' */
	orientation?: ResizableOrientation
	/** Fires with the panels' sizes (percentages summing to 100) after each resize. */
	onSizesChange?: (sizes: number[]) => void
	/**
	 * Fires with the handle's index when a pointer drag-resize begins. Pair with
	 * {@link ResizableGroupProps.onResizeEnd} to bracket the drag.
	 *
	 * `onSizesChange` reports the sizes but not the gesture, and it fires once per frame
	 * for the whole drag — so it cannot say when to persist, and it cannot say when to
	 * hold something expensive down. A keyboard nudge has no drag lifecycle — it commits
	 * straight through `onSizesChange` — so it fires neither of these.
	 */
	onResizeStart?: (handleIndex: number) => void
	/**
	 * Fires with the handle's index when a pointer drag-resize ends, whether the pointer
	 * lifted, the gesture was cancelled, or a second pointer superseded it. Exactly one
	 * end follows each start.
	 *
	 * The settled sizes have already flowed through `onSizesChange`; this only marks the
	 * drag's conclusion — the point to persist from, or to release whatever
	 * `onResizeStart` held.
	 */
	onResizeEnd?: (handleIndex: number) => void
	className?: string
	children?: ReactNode
}

/**
 * Container for a row or column of {@link ResizablePanel}s separated by
 * {@link ResizableHandle}s. Reads each panel's size constraints from its props,
 * tracks live sizes, and supplies drag/resize actions and per-child index to
 * descendants via context.
 */
export function ResizableGroup({
	orientation = 'horizontal',
	onSizesChange,
	onResizeStart,
	onResizeEnd,
	className,
	children,
}: ResizableGroupProps) {
	const groupRef = useRef<HTMLDivElement>(null)

	const panelConfigs = useMemo<PanelConfig[]>(
		() =>
			Children.toArray(children).flatMap((child) => {
				if (!isValidElement(child) || child.type !== ResizablePanel) return []

				const p = child.props as ResizablePanelProps

				return [
					{ defaultSize: p.defaultSize ?? 50, minSize: p.minSize ?? 0, maxSize: p.maxSize ?? 100 },
				]
			}),
		[children],
	)

	const { sizes, dragging, startDrag, resize } = useResizablePanel({
		groupRef,
		orientation,
		panelConfigs,
		onSizesChange,
		onResizeStart,
		onResizeEnd,
	})

	// Wraps each panel/handle in an index provider; context carries its position.
	const wrapped = useMemo(() => {
		let panelIdx = 0
		let handleIdx = 0

		return Children.map(children, (child) => {
			if (!isValidElement(child)) return child

			if (child.type === ResizablePanel) {
				const idx = panelIdx++

				return <ResizableIndexContext value={{ panelIndex: idx }}>{child}</ResizableIndexContext>
			}

			if (child.type === ResizableHandle) {
				const idx = handleIdx++

				return <ResizableIndexContext value={{ handleIndex: idx }}>{child}</ResizableIndexContext>
			}

			return child
		})
	}, [children])

	const contextValue = useMemo(
		() => ({ orientation, dragging, sizes, panelConfigs, startDrag, resize }),
		[orientation, dragging, sizes, panelConfigs, startDrag, resize],
	)

	return (
		<ResizableContext value={contextValue}>
			<div
				ref={groupRef}
				data-slot="resizable-group"
				data-orientation={orientation}
				className={cn(k.group({ orientation }), className)}
			>
				{wrapped}
			</div>
		</ResizableContext>
	)
}
