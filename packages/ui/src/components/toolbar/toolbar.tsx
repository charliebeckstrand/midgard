'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { type ToolbarContextValue, type ToolbarOrientation, ToolbarProvider } from './context'
import { type ToolbarVariants, toolbarVariants } from './variants'

const TOOLBAR_ITEM_SELECTOR = [
	'a[href]',
	'button:not(:disabled)',
	'[tabindex="0"]',
	'[role="button"]:not([aria-disabled="true"])',
	'[role="checkbox"]:not([aria-disabled="true"])',
	'[role="radio"]:not([aria-disabled="true"])',
].join(',')

export type ToolbarProps = Omit<ToolbarVariants, 'orientation'> & {
	orientation?: ToolbarOrientation
	'aria-label'?: string
	'aria-labelledby'?: string
	className?: string
	children?: React.ReactNode
}

export function Toolbar({
	orientation = 'horizontal',
	variant,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	className,
	children,
}: ToolbarProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: TOOLBAR_ITEM_SELECTOR,
		orientation,
	})

	const ctx: ToolbarContextValue = { orientation }

	return (
		<ToolbarProvider value={ctx}>
			<div
				ref={ref}
				data-slot="toolbar"
				role="toolbar"
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-orientation={orientation}
				onKeyDown={handleKeyDown}
				className={cn(toolbarVariants({ orientation, variant }), className)}
			>
				{children}
			</div>
		</ToolbarProvider>
	)
}
