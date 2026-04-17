'use client'

import { cn } from '../../core'
import { Divider } from '../divider'
import { useToolbarContext } from './context'

export type ToolbarSeparatorProps = {
	className?: string
}

export function ToolbarSeparator({ className }: ToolbarSeparatorProps) {
	const { orientation } = useToolbarContext()

	const isHorizontal = orientation === 'horizontal'

	return (
		<Divider
			data-slot="toolbar-separator"
			orientation={isHorizontal ? 'vertical' : 'horizontal'}
			soft
			className={cn(isHorizontal ? 'mx-1 self-stretch' : 'my-1', className)}
		/>
	)
}
