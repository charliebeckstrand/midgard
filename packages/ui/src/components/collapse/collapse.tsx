'use client'

import { type ComponentProps, type ReactNode, useCallback, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useControllableFlag } from '../../hooks/use-controllable'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/collapse'
import { CollapseContext } from './context'

/** Props for {@link Collapse}. */
export type CollapseProps = Omit<ComponentProps<'div'>, 'className' | 'children'> & {
	/**
	 * The initial open state, for an uncontrolled panel.
	 * @defaultValue false
	 */
	defaultOpen?: boolean
	/**
	 * The open state, for a controlled panel. Pair it with `onOpenChange`.
	 *
	 * @defaultValue Uncontrolled: the state starts from `defaultOpen`.
	 */
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Fires once the panel has finished opening and is at rest — after the height
	 * transition lands, or immediately on the open when `animate` is `false`.
	 *
	 * A state change is not an arrival: `onOpenChange` reports the flip, and the panel
	 * is still growing when it does. Use this to focus, measure, or start work that
	 * needs the panel at its settled height. Never fires for a close, and never for a
	 * panel that mounts already open.
	 *
	 * @see {@link DrawerPanelProps.onOpenComplete} for the panel family's form of this callback.
	 */
	onOpenComplete?: () => void
	/**
	 * Animation style for the panel. `'fade'` animates height and opacity.
	 * `'slide'` animates height and moves the content down with the panel edge.
	 * `false` disables the animation.
	 * @defaultValue 'fade'
	 */
	animate?: 'fade' | 'slide' | false
	/**
	 * How the panel is held while closed.
	 *
	 * @remarks
	 * Defaults to `active` — the panel is unmounted while closed, so reopening
	 * resets whatever state it held. `always` mounts it up front, and `lazy` on
	 * first open. Either way a closed panel then rests in
	 * `<Activity mode="hidden">` with its state preserved and effects torn down.
	 * It drops into the hold once the close animation lands.
	 *
	 * @defaultValue 'active'
	 */
	mount?: Mount
	children: ReactNode
	className?: string
}

/**
 * Disclosure container that animates a single panel open and closed. Drives
 * state controllably via `open`/`onOpenChange` or uncontrolled via `defaultOpen`,
 * wires `aria-expanded`/`aria-controls` through {@link useCollapseContext}, and
 * honors reduced-motion. Compose `<CollapseTrigger>` and `<CollapsePanel>` as
 * children for full control over placement.
 *
 * @see {@link CollapseTrigger}
 * @see {@link CollapsePanel}
 */
export function Collapse({
	defaultOpen = false,
	open: openProp,
	onOpenChange,
	onOpenComplete,
	animate: animateProp = 'fade',
	mount = 'active',
	children,
	className,
	...props
}: CollapseProps) {
	const [open, setCurrentOpen] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const toggle = useCallback(() => setCurrentOpen(!open), [open, setCurrentOpen])

	const { triggerProps, panelProps } = useA11yDisclosure({ expanded: open })

	// A stable event, so the context memo does not key on the caller's callback. That
	// callback would otherwise be the one unstable member, and each consumer would
	// render again on each parent render.
	const reportOpenComplete = useStableEvent(() => {
		onOpenComplete?.()
	})

	const value = useMemo(
		() => ({
			open,
			toggle,
			animate: animateProp,
			mount,
			onOpenComplete: reportOpenComplete,
			triggerProps,
			panelProps,
		}),
		[open, toggle, animateProp, mount, reportOpenComplete, triggerProps, panelProps],
	)

	return (
		<CollapseContext value={value}>
			<div
				{...props}
				data-slot="collapse"
				data-open={dataAttr(open)}
				className={cn(k.base, className)}
			>
				{children}
			</div>
		</CollapseContext>
	)
}
