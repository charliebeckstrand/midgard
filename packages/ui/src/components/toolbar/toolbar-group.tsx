'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k, type ToolbarGroupVariants } from '../../recipes/kata/toolbar'
import { useToolbarContext } from './context'

/** Props for {@link ToolbarGroup}. */
export type ToolbarGroupProps = Omit<ToolbarGroupVariants, 'orientation'> & {
	'aria-label'?: string
	className?: string
	children?: ReactNode
}

/**
 * Visual cluster of related controls within a `<Toolbar>`, rendered as a
 * `role="group"`. Takes its orientation from toolbar context.
 */
export function ToolbarGroup({ 'aria-label': ariaLabel, className, children }: ToolbarGroupProps) {
	const { orientation } = useToolbarContext()

	return (
		// biome-ignore lint/a11y/useSemanticElements: role="group" is the correct ARIA pattern for clustering related toolbar controls
		<div
			data-slot="toolbar-group"
			role="group"
			aria-label={ariaLabel}
			className={cn(k.group({ orientation }), className)}
		>
			{children}
		</div>
	)
}
