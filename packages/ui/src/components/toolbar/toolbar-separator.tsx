'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toolbar'
import { Divider } from '../divider'
import { useToolbarContext } from './context'

/**
 * Props for {@link ToolbarSeparator}: native `<hr>` attributes. The toolbar
 * sets the orientation of the rule, and the rule keeps the `separator` role.
 */
export type ToolbarSeparatorProps = Omit<ComponentProps<'hr'>, 'role'>

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
export function ToolbarSeparator({ className, ...props }: ToolbarSeparatorProps) {
	const { orientation } = useToolbarContext()

	const horizontal = orientation === 'horizontal'

	return (
		<Divider
			{...props}
			// The row edges read the anchor, so it comes after the spread.
			data-slot="toolbar-separator"
			orientation={horizontal ? 'vertical' : 'horizontal'}
			soft
			className={cn(
				k({ orientation }).separator,
				horizontal && 'data-row-edge:invisible',
				className,
			)}
		/>
	)
}
