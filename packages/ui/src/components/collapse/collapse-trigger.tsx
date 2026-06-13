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
			type="button"
			// Consumer props spread first; the a11y id wiring
			// (aria-expanded/aria-controls), context-driven toggle, and data-slot
			// below take precedence.
			{...props}
			data-slot="collapse-trigger"
			{...triggerProps}
			// The panel unmounts while closed (AnimatePresence); the reference
			// is set only while its target id exists.
			aria-controls={open ? triggerProps['aria-controls'] : undefined}
			onClick={(e) => {
				toggle()
				onClick?.(e)
			}}
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
