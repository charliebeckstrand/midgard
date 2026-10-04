'use client'

import { type ComponentProps, type ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useResizeObserver } from '../../hooks'
import { k, type ToolbarVariants } from '../../recipes/kata/toolbar'
import type { AccessibleName } from '../../types'
import { ToolbarContext, type ToolbarContextValue } from './context'
import { TOOLBAR_ITEM_SELECTOR } from './toolbar-constants'
import { markRowEdges } from './toolbar-row-edges'
import type { ToolbarOrientation } from './types'

/** Props for {@link Toolbar}. Requires `aria-label` or `aria-labelledby`. */
export type ToolbarProps = AccessibleName &
	Omit<ToolbarVariants, 'orientation'> &
	Omit<ComponentProps<'div'>, 'className' | 'onKeyDown' | 'aria-label' | 'aria-labelledby'> & {
		/**
		 * Layout axis and arrow-key navigation direction.
		 * @defaultValue 'horizontal'
		 */
		orientation?: ToolbarOrientation
		className?: string
		children?: ReactNode
	}

/**
 * ARIA toolbar grouping related controls with roving-tabindex arrow-key
 * navigation along its `orientation`. Requires `aria-label`/`aria-labelledby`;
 * the group is never an unnamed `toolbar`.
 *
 * @remarks
 * A horizontal toolbar wraps onto more rows when it is narrow. A
 * `<ToolbarSeparator>` that then ends or starts a row separates nothing, so
 * the toolbar hides it. One `ResizeObserver` on the toolbar measures the rows
 * again when the toolbar changes size. A vertical toolbar, or a horizontal
 * toolbar on one row, shows each separator.
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

	// The rows change only when the toolbar changes size or axis. The layout
	// effect marks the rows before the first paint, and the observer runs after it.
	useResizeObserver(ref, () => markRowEdges(ref.current, orientation))

	useLayoutEffect(() => markRowEdges(ref.current, orientation), [orientation])

	const context = useMemo<ToolbarContextValue>(() => ({ orientation }), [orientation])

	return (
		<ToolbarContext value={context}>
			<div
				{...labelProps}
				ref={ref}
				data-slot="toolbar"
				role="toolbar"
				aria-orientation={orientation}
				onKeyDown={handleKeyDown}
				className={cn(k.base({ orientation, variant }), className)}
			>
				{children}
			</div>
		</ToolbarContext>
	)
}
