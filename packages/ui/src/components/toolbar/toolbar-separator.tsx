'use client'

import { cn } from '../../core'
import { Divider } from '../divider'
import { useToolbarContext } from './context'

/** Props for {@link ToolbarSeparator}. */
export type ToolbarSeparatorProps = {
	className?: string
}

/**
 * Soft `<Divider>` between toolbar clusters, drawn perpendicular to the
 * toolbar's orientation (vertical rule in a horizontal toolbar, and vice versa).
 */
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
