'use client'

import type { FloatingFocusManagerProps } from '@floating-ui/react'
import { motion } from 'motion/react'
import { type ReactNode, useLayoutEffect, useState } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useA11yHasTabbable } from '../../hooks'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { FloatingSurface } from '../../primitives/floating-surface'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type scale } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'

/**
 * The focus manager of an interactive panel that holds a tabbable control. The
 * panel is a non-modal dialog, so the manager does not trap Tab and does not
 * hide the page from assistive tech. The guards of the portal keep the tab
 * order of the trigger: Tab from the trigger goes into the panel controls, and
 * Tab after the last control goes to the element after the trigger.
 * `returnFocus` puts focus back on the trigger when the tooltip closes from
 * inside the panel.
 */
const DIALOG_FOCUS: Omit<FloatingFocusManagerProps, 'context' | 'children'> = {
	modal: false,
	returnFocus: true,
}

/** Props for {@link TooltipContent}. */
export type TooltipContentProps = {
	/**
	 * The density step of the padding, the radius, and the text. Omit it to take
	 * the step of the nearest density scope of the trigger, which the portal
	 * carries. A step makes the panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
	/**
	 * Class for the positioned wrapper around the panel, rather than for the panel
	 * itself.
	 *
	 * For the properties the panel's own entrance animates — `opacity` and
	 * `scale` — which `motion` writes as inline styles that no class can outrank.
	 * A caller that wants to fade a standing panel sets the fade here, where it
	 * composes with the entrance instead of fighting it.
	 */
	surfaceClassName?: string
	/**
	 * Opt the surface into the translucent glass chrome, as the panel family
	 * does. An ambient `<GlassProvider>` already turns it on; this is the
	 * per-surface opt-in for a tree that has none. Set `false` to keep the flat
	 * surface inside a `<GlassProvider>`.
	 *
	 * @defaultValue the ambient `<GlassProvider>` flag
	 */
	glass?: boolean
	children: ReactNode
}

/**
 * Floating panel rendered when the enclosing `<Tooltip>` is open. Positions
 * via `<FloatingSurface>`, animates in, and adopts the glass surface from
 * `glass` or an active `<GlassProvider>`.
 *
 * @remarks Pointer events are disabled unless the tooltip is `interactive`,
 * so a non-interactive panel never intercepts hover. An `interactive` panel
 * that holds something tabbable joins the tab order of the trigger. Tab goes
 * from the trigger into the panel controls, and Tab after the last control
 * goes to the element after the trigger. Shift+Tab goes back the same way.
 * Focus does not stay in the panel, and the page stays visible to assistive
 * tech. When the tooltip closes from inside the panel, focus goes back to the
 * trigger. A prose panel that the pointer can only reach adds nothing to the
 * tab order.
 *
 * The same probe sets the role. An `interactive` panel that holds a tabbable
 * control is a non-modal `role="dialog"` without `aria-modal`, and the trigger
 * gives its name. Any other panel is a `role="tooltip"` that describes the
 * trigger.
 * @see {@link useA11yHasTabbable}
 */
export function TooltipContent({
	size,
	className,
	surfaceClassName,
	glass: glassProp,
	children,
}: TooltipContentProps) {
	const {
		open,
		interactive,
		setFloating,
		floatingStyles,
		getFloatingProps,
		floatingContext,
		reportTabbable,
	} = useTooltipContext()

	const glass = useResolvedSurface(glassProp) === 'glass'

	// The scale moves `transform`, which `MotionConfig` does not hold still, so the
	// panel reads the setting itself (WCAG 2.3.3).
	const preset = usePrefersReducedMotion() ? k.still : k.motion

	// State, not a ref: the panel mounts a commit after the portal node exists,
	// and the probe has to run against the node React attaches.
	const [panel, setPanel] = useState<HTMLDivElement | null>(null)

	const hasTabbable = useA11yHasTabbable(panel)

	// Reported only while the panel is mounted. A closed tooltip keeps the last
	// state, so the trigger relation does not change between two opens.
	useLayoutEffect(() => {
		if (panel) reportTabbable?.(hasTabbable)
	}, [panel, hasTabbable, reportTabbable])

	return (
		<FloatingSurface
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			className={surfaceClassName}
			// `pointer-events` is inherited, so gating it here gates the whole panel
			// subtree; the inner surface carries no rule of its own.
			style={{ pointerEvents: interactive ? 'auto' : 'none' }}
			// Mounted for the whole open lifetime of an interactive tooltip and
			// gated through `disabled`. The probe finds a tabbable control one commit
			// after the panel mounts, and the manager then starts in place. It does
			// not remount the panel around a new manager.
			trapFocusContext={interactive ? floatingContext : undefined}
			trapFocusProps={{ ...DIALOG_FOCUS, disabled: !hasTabbable }}
			data-slot="tooltip-content"
			density={size}
		>
			<motion.div
				{...preset}
				ref={setPanel}
				className={cn(k.content.base, k.content.surface[glass ? 'glass' : 'default'], className)}
			>
				{children}
			</motion.div>
		</FloatingSurface>
	)
}
