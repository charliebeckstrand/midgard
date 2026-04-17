'use client'

import { cn } from '../../core'
import { k } from './variants'

export type ResizablePanelProps = {
	defaultSize?: number
	minSize?: number
	maxSize?: number
	className?: string
	children?: React.ReactNode
}

export function ResizablePanel(props: ResizablePanelProps) {
	const { defaultSize = 50, className, children } = props

	const size = (props as Record<string, unknown>)._size ?? defaultSize

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
