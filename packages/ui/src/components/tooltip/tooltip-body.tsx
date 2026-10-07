'use client'

import type { FloatingFocusManagerProps } from '@floating-ui/react'
import { useLayoutEffect, useState } from 'react'
import { cn } from '../../core'
import { useA11yHasTabbable } from '../../hooks'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { FloatingSurface } from '../../primitives/floating-surface'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { useResolvedSurface } from '../../providers/glass/context'
import { k } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'
import type { TooltipContentProps } from './tooltip-content'

/**
 * The focus manager of an interactive panel that holds a tabbable control. The
 * panel is a non-modal dialog, so the manager does not trap Tab and does not
 * hide the page from assistive tech. The guards of the portal keep the tab
 * order of the trigger: Tab from the trigger goes into the panel controls, and
 * Tab after the last control goes to the element after the trigger.
 * `TooltipContent` sets `returnFocus`, which puts focus back on the trigger
 * when the tooltip closes from inside the panel.
 */
const DIALOG_FOCUS: Omit<FloatingFocusManagerProps, 'context' | 'children'> = {
	modal: false,
}

/**
 * The panel of {@link TooltipContent}, in a module of its own. It carries
 * Motion and the floating surface, so `TooltipContent` loads it on demand.
 * `TooltipPointer` and `TooltipAnchor` render it directly.
 * @internal
 */
export function TooltipBody({
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

	// The panel that holds focus, or `null`. Focus goes back to the trigger on a
	// close only from the panel. Floating UI also puts focus on the trigger when
	// focus is on the body, but a tap in WebKit gives a button no focus. A
	// trigger that a close focused then loses the focus on the press of the next
	// tap, and `useFocus` closes the tooltip that the tap opens. The node, not a
	// flag: a removed node sends no `blur`, and the next panel is a new node.
	const [focusedPanel, setFocusedPanel] = useState<HTMLElement | null>(null)

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
			trapFocusProps={{
				...DIALOG_FOCUS,
				returnFocus: panel !== null && focusedPanel === panel,
				disabled: !hasTabbable,
			}}
			data-slot="tooltip-content"
			density={size}
		>
			<m.div
				{...preset}
				ref={setPanel}
				onFocus={(event) => setFocusedPanel(event.currentTarget)}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget)) setFocusedPanel(null)
				}}
				className={cn(k.content.base, k.content.surface[glass ? 'glass' : 'default'], className)}
			>
				{children}
			</m.div>
		</FloatingSurface>
	)
}
