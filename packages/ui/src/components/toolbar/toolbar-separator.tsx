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
 *
 * @remarks
 * When a horizontal `<Toolbar>` wraps, a separator that ends or starts a row
 * gets `data-row-edge` and becomes invisible. It keeps its box, so the rows do
 * not change, and `visibility: hidden` also removes it from the accessibility
 * tree. Only a separator that is a direct child of the toolbar gets the mark.
 */
export function ToolbarSeparator({ className }: ToolbarSeparatorProps) {
	const { orientation } = useToolbarContext()

	const isHorizontal = orientation === 'horizontal'

	return (
		<Divider
			data-slot="toolbar-separator"
			orientation={isHorizontal ? 'vertical' : 'horizontal'}
			soft
			className={cn(isHorizontal ? 'mx-1 data-row-edge:invisible' : 'my-1', className)}
		/>
	)
}
