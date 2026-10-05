'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toolbar'
import { useToolbarContext } from './context'

/** Props for {@link ToolbarGroup}. */
export type ToolbarGroupProps = {
	/** The accessible name of the group. Name a group when the toolbar has more than one. */
	'aria-label'?: string
	className?: string
	children?: ReactNode
}

/**
 * Visual cluster of related controls within a `<Toolbar>`, rendered as a
 * `<fieldset>`, which has the `group` role. Takes its orientation from toolbar
 * context.
 */
export function ToolbarGroup({ 'aria-label': ariaLabel, className, children }: ToolbarGroupProps) {
	const { orientation } = useToolbarContext()

	return (
		<fieldset
			data-slot="toolbar-group"
			aria-label={ariaLabel}
			className={cn(k.group({ orientation }), className)}
		>
			{children}
		</fieldset>
	)
}
