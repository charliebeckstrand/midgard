'use client'

import { useComposedRefs } from 'motion/react'
import {
	Children,
	type ComponentProps,
	isValidElement,
	useCallback,
	useId,
	useMemo,
	useRef,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { ResizableContext, ResizableIndexContext } from './context'
import { ResizableHandle } from './resizable-handle'
import { ResizablePanel, type ResizablePanelProps } from './resizable-panel'
import type { PanelConfig, ResizableOrientation } from './types'
import { useResizablePanel } from './use-resizable-panel'

/**
 * Props for {@link ResizableGroup}: layout `orientation`, a size-change callback,
 * and the drag bracket. The root `<div>` takes the rest.
 */
export type ResizableGroupProps = ComponentProps<'div'> & {
	/**
	 * The layout axis: `horizontal` puts the panels in a row, and `vertical` puts
	 * them in a column.
	 * @defaultValue 'horizontal'
	 */
	orientation?: ResizableOrientation
	/** Fires when a resize changes the sizes, with the panel sizes (percentages summing to 100). */
	onSizesChange?: (sizes: number[]) => void
	/**
	 * Fires when a pointer drag-resize begins, with the index of the handle. Pair with
	 * {@link ResizableGroupProps.onResizeEnd} to bracket the drag.
	 *
	 * `onSizesChange` reports the sizes but not the gesture, and it fires once per
	 * frame for the whole drag. It therefore cannot say when to persist, nor when
	 * to hold something expensive down. A keyboard nudge has no drag lifecycle and
	 * commits straight through `onSizesChange`, so it fires neither of these.
	 */
	onResizeStart?: (handleIndex: number) => void
	/**
	 * Fires when a pointer drag-resize ends, with the index of the handle: the pointer lifted,
	 * the gesture was canceled, or the `orientation` of the group changed (the next move
	 * then ends the drag). The press, the move, or the lift of a different pointer does
	 * not start a drag or end this one. Exactly one end follows each start.
	 *
	 * The settled sizes have already flowed through `onSizesChange`; this only marks the
	 * drag's conclusion — the point to persist from, or to release whatever
	 * `onResizeStart` held.
	 */
	onResizeEnd?: (handleIndex: number) => void
}

/**
 * Container for a row or column of {@link ResizablePanel}s separated by
 * {@link ResizableHandle}s. Reads each panel's size constraints from its props,
 * tracks live sizes, and supplies drag/resize actions and per-child index to
 * descendants via context.
 *
 * @remarks A change to the set of panels resets the sizes to the panel
 * defaults. The panel keys name the set. A panel that replaces another at the
 * same position therefore needs a `key` of its own.
 */
export function ResizableGroup({
	orientation = 'horizontal',
	onSizesChange,
	onResizeStart,
	onResizeEnd,
	ref,
	className,
	children,
	...props
}: ResizableGroupProps) {
	const groupRef = useRef<HTMLDivElement>(null)

	const composedRef = useComposedRefs(groupRef, ref)

	const panelConfigs = useMemo<PanelConfig[]>(
		() =>
			Children.toArray(children).flatMap((child) => {
				if (!isValidElement(child) || child.type !== ResizablePanel) return []

				const props = child.props as ResizablePanelProps

				return [
					{
						key: String(child.key),
						defaultSize: props.defaultSize ?? 50,
						minSize: props.minSize ?? 0,
						maxSize: props.maxSize ?? 100,
					},
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

	const baseId = useId()

	// Each panel takes an id from its index, so the handle after it can name it.
	const panelId = useCallback((panelIndex: number) => `${baseId}-panel-${panelIndex}`, [baseId])

	// Wraps each panel/handle in an index provider; context carries its position.
	const wrapped = useMemo(() => {
		const next = { panel: 0, handle: 0 }

		return Children.map(children, (child) => {
			if (!isValidElement(child)) return child

			if (child.type === ResizablePanel) {
				const index = next.panel

				next.panel += 1

				return <ResizableIndexContext value={{ panelIndex: index }}>{child}</ResizableIndexContext>
			}

			if (child.type === ResizableHandle) {
				const index = next.handle

				next.handle += 1

				return <ResizableIndexContext value={{ handleIndex: index }}>{child}</ResizableIndexContext>
			}

			return child
		})
	}, [children])

	const contextValue = useMemo(
		() => ({ orientation, dragging, sizes, panelConfigs, startDrag, resize, panelId }),
		[orientation, dragging, sizes, panelConfigs, startDrag, resize, panelId],
	)

	return (
		<ResizableContext value={contextValue}>
			<div
				data-slot="resizable-group"
				{...props}
				ref={composedRef}
				data-orientation={orientation}
				className={cn(k.group({ orientation }), className)}
			>
				{wrapped}
			</div>
		</ResizableContext>
	)
}
