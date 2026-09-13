'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

/** Props for {@link CollapseTrigger}; extends native `<button>` attributes. */
export type CollapseTriggerProps = ComponentPropsWithoutRef<'button'>

/**
 * Button that toggles the enclosing {@link Collapse} for the compound API.
 * Spreads consumer props first, then overlays the context-driven toggle and
 * a11y wiring (`aria-expanded`, plus `aria-controls` only while the panel is
 * mounted), preserving any supplied `onClick`.
 */
export function CollapseTrigger({ className, children, onClick, ...props }: CollapseTriggerProps) {
	const { open, toggle, triggerProps } = useCollapseContext()

	return (
		<button
			// No library selector reads this anchor, so it stays above the spread
			// and a wrapper can re-anchor the trigger (CONVENTIONS.md §3.9).
			data-slot="collapse-trigger"
			// Consumer props spread first; the type, the a11y id wiring
			// (aria-expanded/aria-controls) and the context-driven toggle below
			// take precedence.
			{...props}
			type="button"
			{...triggerProps}
			// The panel unmounts while closed (AnimatePresence); the reference
			// is set only while its target id exists.
			aria-controls={open ? triggerProps['aria-controls'] : undefined}
			onClick={(event) => {
				toggle()
				onClick?.(event)
			}}
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
