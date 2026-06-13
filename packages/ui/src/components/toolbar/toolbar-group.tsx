'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k, type ToolbarGroupVariants } from '../../recipes/kata/toolbar'
import { useToolbarContext } from './context'
import type { ToolbarOrientation } from './types'

/** Props for {@link ToolbarGroup}. */
export type ToolbarGroupProps = Omit<ToolbarGroupVariants, 'orientation'> & {
	/**
	 * Cluster axis; inherits the enclosing `<Toolbar>` orientation when unset.
	 * @defaultValue the parent toolbar's orientation
	 */
	orientation?: ToolbarOrientation
	'aria-label'?: string
	className?: string
	children?: ReactNode
}

/**
 * Visual cluster of related controls within a `<Toolbar>`, rendered as a
 * `role="group"`. Inherits orientation from toolbar context unless overridden.
 */
export function ToolbarGroup({
	orientation: orientationProp,
	'aria-label': ariaLabel,
	className,
	children,
}: ToolbarGroupProps) {
	const { orientation: toolbarOrientation } = useToolbarContext()

	const orientation = orientationProp ?? toolbarOrientation

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
