'use client'

import { Children, isValidElement, type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { ResizableIndexProvider, ResizableProvider } from './context'
import { ResizableHandle } from './resizable-handle'
import { ResizablePanel, type ResizablePanelProps } from './resizable-panel'
import type { PanelConfig, ResizableDirection } from './types'
import { useResizablePanel } from './use-resizable-panel'

export type ResizableGroupProps = {
	direction?: ResizableDirection
	onSizesChange?: (sizes: number[]) => void
	className?: string
	children?: ReactNode
}

export function ResizableGroup({
	direction = 'horizontal',
	onSizesChange,
	className,
	children,
}: ResizableGroupProps) {
	const groupRef = useRef<HTMLDivElement>(null)

	// Extract panel configs from children
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
		direction,
		panelConfigs,
		onSizesChange,
	})

	// Wrap each panel/handle in an index provider so they can read their position from context.
	const wrapped = useMemo(() => {
		let panelIdx = 0
		let handleIdx = 0

		return Children.map(children, (child) => {
			if (!isValidElement(child)) return child

			if (child.type === ResizablePanel) {
				const idx = panelIdx++

				return <ResizableIndexProvider value={{ panelIndex: idx }}>{child}</ResizableIndexProvider>
			}

			if (child.type === ResizableHandle) {
				const idx = handleIdx++

				return <ResizableIndexProvider value={{ handleIndex: idx }}>{child}</ResizableIndexProvider>
			}

			return child
		})
	}, [children])

	const contextValue = useMemo(
		() => ({ direction, dragging, sizes, panelConfigs, startDrag, resize }),
		[direction, dragging, sizes, panelConfigs, startDrag, resize],
	)

	return (
		<ResizableProvider value={contextValue}>
			<div
				ref={groupRef}
				data-slot="resizable-group"
				data-direction={direction}
				className={cn(k.group, direction === 'horizontal' ? 'flex-row' : 'flex-col', className)}
			>
				{wrapped}
			</div>
		</ResizableProvider>
	)
}
