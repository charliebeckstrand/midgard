'use client'

import { type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { k, type ToolbarVariants } from '../../recipes/kata/toolbar'
import type { AccessibleName } from '../../types'
import { ToolbarContext, type ToolbarContextValue } from './context'
import { TOOLBAR_ITEM_SELECTOR } from './toolbar-constants'
import type { ToolbarOrientation } from './types'

export type ToolbarProps = AccessibleName &
	Omit<ToolbarVariants, 'orientation'> & {
		orientation?: ToolbarOrientation
		className?: string
		children?: ReactNode
	}

/**
 * ARIA toolbar grouping related controls with roving-tabindex arrow-key
 * navigation along its `orientation`. Requires `aria-label`/`aria-labelledby`
 * so the group is never an unnamed `toolbar`.
 */
export function Toolbar({
	orientation = 'horizontal',
	variant,
	className,
	children,
	...labelProps
}: ToolbarProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: TOOLBAR_ITEM_SELECTOR,
		orientation,
		// Single Tab stop: Tab enters and leaves the group; arrows move between controls.
		manageTabIndex: true,
	})

	const context = useMemo<ToolbarContextValue>(() => ({ orientation }), [orientation])

	return (
		<ToolbarContext value={context}>
			<div
				ref={ref}
				data-slot="toolbar"
				role="toolbar"
				aria-orientation={orientation}
				onKeyDown={handleKeyDown}
				className={cn(k.root({ orientation, variant }), className)}
				{...labelProps}
			>
				{children}
			</div>
		</ToolbarContext>
	)
}
