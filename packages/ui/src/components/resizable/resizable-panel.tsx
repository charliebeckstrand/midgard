'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useResizable, useResizableIndex } from './context'
import { k } from './variants'

export type ResizablePanelProps = {
	defaultSize?: number
	minSize?: number
	maxSize?: number
	className?: string
	children?: ReactNode
}

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
