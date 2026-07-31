'use client'

import type { FloatingFocusManagerProps } from '@floating-ui/react'
import { motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import { cn } from '../../core'
import { useA11yHasTabbable } from '../../hooks'
import { useDensity } from '../../primitives/density'
import { FloatingSurface } from '../../primitives/floating-surface'
import { useGlass } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'

/**
 * Tab cycle for the interactive trap: trigger first, then the panel's own
 * tabbables. Including the reference is what makes a tooltip trap reachable —
 * the trigger keeps focus when the tooltip opens, so a content-only cycle
 * would leave Tab walking into the page instead of the panel, and floating-ui
 * `aria-hidden`s everything outside the cycle, which would swallow the very
 * trigger the panel describes.
 */
const TRAP_ORDER: FloatingFocusManagerProps['order'] = ['reference', 'content']

/** Props for {@link TooltipContent}. */
export type TooltipContentProps = {
	/**
	 * Size step that drives padding and text size.
	 *
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

/**
 * Floating panel rendered when the enclosing `<Tooltip>` is open. Positions
 * via `<FloatingSurface>`, animates in, and adopts the glass surface when a
 * `<GlassProvider>` is active.
 *
 * @remarks Pointer events are disabled unless the tooltip is `interactive`,
 * so a non-interactive panel never intercepts hover. An `interactive` panel
 * that holds something tabbable also traps focus: Tab steps off the trigger
 * into the panel, cycles its controls, and wraps back to the trigger, with
 * focus restored there if the tooltip closes from inside (WCAG 2.1.2). The
 * trap engages only once the panel actually has a tabbable — a prose tooltip
 * the pointer can merely reach never captures the keyboard.
 * @see {@link useA11yHasTabbable}
 */
export function TooltipContent({ size, className, children }: TooltipContentProps) {
	const { open, interactive, setFloating, floatingStyles, getFloatingProps, floatingContext } =
		useTooltipContext()

	const glass = useGlass()
	const inherited = useDensity()

	// State, not a ref: the panel mounts a commit after the portal node exists,
	// and the probe has to run against the node React attaches.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const hasTabbable = useA11yHasTabbable(panel)

	const resolvedSize: Step = size ?? inherited.size

	return (
		<FloatingSurface
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			style={{ pointerEvents: interactive ? 'auto' : 'none' }}
			// Mounted for the whole open lifetime of an interactive tooltip and
			// gated through `disabled`, so the probe finding a tabbable one commit
			// after the panel mounts engages the trap in place rather than
			// remounting the panel around a newly-inserted manager.
			trapFocusContext={interactive ? floatingContext : undefined}
			trapFocusProps={{ disabled: !hasTabbable, order: TRAP_ORDER, returnFocus: true }}
			data-slot="tooltip-content"
			data-size={resolvedSize}
		>
			<motion.div
				{...k.motion}
				ref={setPanel}
				className={cn(
					k.content({ size: resolvedSize }),
					interactive ? 'pointer-events-auto' : 'pointer-events-none',
					k.surface[glass ? 'glass' : 'default'],
					className,
				)}
			>
				{children}
			</motion.div>
		</FloatingSurface>
	)
}
