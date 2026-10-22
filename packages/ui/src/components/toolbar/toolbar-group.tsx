'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toolbar'
import { useToolbarContext } from './context'

/** Props for {@link ToolbarGroup}. The `<fieldset>` takes the rest. */
export type ToolbarGroupProps = ComponentProps<'fieldset'> & {
	/** The accessible name of the group. Name a group when the toolbar has more than one. */
	'aria-label'?: string
}

/**
 * Visual cluster of related controls within a `<Toolbar>`, rendered as a
 * `<fieldset>`, which has the `group` role. Takes its orientation from toolbar
 * context.
 */
export function ToolbarGroup({ className, children, ...props }: ToolbarGroupProps) {
	const { orientation } = useToolbarContext()

	return (
		<fieldset
			data-slot="toolbar-group"
			{...props}
			className={cn(k({ orientation }).group, className)}
		>
			{children}
		</fieldset>
	)
}
