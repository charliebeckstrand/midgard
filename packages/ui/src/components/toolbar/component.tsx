'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { Divider } from '../divider'
import {
	type ToolbarContextValue,
	type ToolbarOrientation,
	ToolbarProvider,
	useToolbarContext,
} from './context'
import {
	type ToolbarGroupVariants,
	type ToolbarVariants,
	toolbarGroupVariants,
	toolbarVariants,
} from './variants'

const TOOLBAR_ITEM_SELECTOR = [
	'button:not(:disabled)',
	'a[href]',
	'[role="button"]:not([aria-disabled="true"])',
	'[role="checkbox"]:not([aria-disabled="true"])',
	'[role="radio"]:not([aria-disabled="true"])',
	'[tabindex="0"]',
].join(',')

// ── Toolbar ─────────────────────────────────────────────

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

// ── ToolbarGroup ────────────────────────────────────────

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

// ── ToolbarSeparator ────────────────────────────────────

export type ToolbarSeparatorProps = {
	className?: string
}

export function ToolbarSeparator({ className }: ToolbarSeparatorProps) {
	const { orientation } = useToolbarContext()

	const isHorizontal = orientation === 'horizontal'

	return (
		<Divider
			data-slot="toolbar-separator"
			orientation={isHorizontal ? 'vertical' : 'horizontal'}
			soft
			className={cn(isHorizontal ? 'mx-1 self-stretch' : 'my-1', className)}
		/>
	)
}
