'use client'

import { Children, isValidElement, type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { ResizableContext, ResizableIndexContext } from './context'
import { ResizableHandle } from './resizable-handle'
import { ResizablePanel, type ResizablePanelProps } from './resizable-panel'
import type { PanelConfig, ResizableOrientation } from './types'
import { useResizablePanel } from './use-resizable-panel'

/** Props for {@link ResizableGroup}: layout `orientation` and a size-change callback. */
export type ResizableGroupProps = {
	/** @defaultValue 'horizontal' */
	orientation?: ResizableOrientation
	/** Fires with the panels' sizes (percentages summing to 100) after each resize. */
	onSizesChange?: (sizes: number[]) => void
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
	className,
	children,
}: ResizableGroupProps) {
	const groupRef = useRef<HTMLDivElement>(null)

	const panelConfigs = useMemo<PanelConfig[]>(() => {
		const configs: PanelConfig[] = []

		for (const child of Children.toArray(children)) {
			if (isValidElement(child) && child.type === ResizablePanel) {
				const p = child.props as ResizablePanelProps

				configs.push({
					defaultSize: p.defaultSize ?? 50,
					minSize: p.minSize ?? 0,
					maxSize: p.maxSize ?? 100,
				})
			}
		}

		return configs
	}, [children])

	const { sizes, dragging, startDrag, resize } = useResizablePanel({
		groupRef,
		orientation,
		panelConfigs,
		onSizesChange,
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
