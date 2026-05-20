'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k, type ToolbarGroupVariants } from '../../recipes/kata/toolbar'
import { useToolbarContext } from './context'
import type { ToolbarOrientation } from './types'

export type ToolbarGroupProps = Omit<ToolbarGroupVariants, 'orientation'> & {
	orientation?: ToolbarOrientation
	'aria-label'?: string
	className?: string
	children?: ReactNode
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
			className={cn(k.group({ orientation }), className)}
		>
			{children}
		</div>
	)
}
