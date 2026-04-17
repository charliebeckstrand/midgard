'use client'

import { cn } from '../../core'
import { type ToolbarOrientation, useToolbarContext } from './context'
import { type ToolbarGroupVariants, toolbarGroupVariants } from './variants'

export type ToolbarGroupProps = Omit<ToolbarGroupVariants, 'orientation'> & {
	orientation?: ToolbarOrientation
	'aria-label'?: string
	className?: string
	children?: React.ReactNode
}

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
			className={cn(toolbarGroupVariants({ orientation }), className)}
		>
			{children}
		</div>
	)
}
