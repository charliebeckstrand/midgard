'use client'

import type { ComponentProps } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { mountsEveryPanel } from '../../primitives/mount'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

/** Props for {@link CollapseTrigger}; extends native `<button>` attributes. */
export type CollapseTriggerProps = ComponentProps<'button'>

/**
 * Button that toggles the enclosing {@link Collapse} for the compound API.
 * Spreads consumer props first, then overlays the context-driven toggle and
 * a11y wiring (`aria-expanded`, plus `aria-controls` while open, or always
 * under `mount="always"`), preserving any supplied `onClick`.
 *
 * @remarks The `data-slot` anchor stays renameable, because no library selector
 * reads it ([CONVENTIONS.md](CONVENTIONS.md) §3.9).
 */
export function CollapseTrigger({ className, children, onClick, ...props }: CollapseTriggerProps) {
	const { open, toggle, mount, triggerProps } = useCollapseContext()

	return (
		<button
			data-slot="collapse-trigger"
			// Consumer props spread first; the type, the a11y id wiring
			// (aria-expanded/aria-controls) and the context-driven toggle below
			// take precedence.
			{...props}
			type="button"
			{...triggerProps}
			// The reference needs its target id in the DOM. An open panel is
			// present, and a closed panel is present only under `mount="always"`.
			aria-controls={open || mountsEveryPanel(mount) ? triggerProps['aria-controls'] : undefined}
			// The toggle is the activation the trigger exists to perform, so a
			// consumer's preventDefault() does not cancel it (CONVENTIONS.md §3.9).
			onClick={composeEventHandlers(onClick, toggle, { checkForDefaultPrevented: false })}
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}
