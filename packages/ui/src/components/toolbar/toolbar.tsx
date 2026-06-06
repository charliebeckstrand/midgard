'use client'

import { type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { k, type ToolbarVariants } from '../../recipes/kata/toolbar'
import { ToolbarContext, type ToolbarContextValue } from './context'
import { TOOLBAR_ITEM_SELECTOR } from './toolbar-constants'
import type { ToolbarOrientation } from './types'

export type ToolbarProps = Omit<ToolbarVariants, 'orientation'> & {
	orientation?: ToolbarOrientation
	'aria-label'?: string
	'aria-labelledby'?: string
	className?: string
	children?: ReactNode
}

/** ARIA toolbar grouping related controls with roving-tabindex arrow-key navigation along its `orientation`. */
export function Toolbar({
	orientation = 'horizontal',
	variant,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	className,
	children,
}: ToolbarProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(ref, {
		itemSelector: TOOLBAR_ITEM_SELECTOR,
		orientation,
	})

	const context = useMemo<ToolbarContextValue>(() => ({ orientation }), [orientation])

	return (
		<ToolbarContext value={context}>
			<div
				ref={ref}
				data-slot="toolbar"
				role="toolbar"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-orientation={orientation}
				onKeyDown={handleKeyDown}
				className={cn(k.root({ orientation, variant }), className)}
			>
				{children}
			</div>
		</ToolbarContext>
	)
}
