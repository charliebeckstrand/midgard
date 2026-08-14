'use client'

import { type ReactNode, useCallback, useEffectEvent, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useControllable } from '../../hooks/use-controllable'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/collapse'
import { CollapseContext } from './context'

/** Props for {@link Collapse}. */
export type CollapseProps = {
	/** @defaultValue false */
	defaultOpen?: boolean
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
	 * @see {@link DrawerProps.onOpenComplete} for the panel family's form of this callback.
	 */
	onOpenComplete?: () => void
	/**
	 * Animation style for the panel. `true` or `'fade'` for height + opacity,
	 * `'slide'` for height only, `false` to disable.
	 * @defaultValue 'fade'
	 */
	animate?: boolean | 'fade' | 'slide'
	/**
	 * How the panel is held while closed.
	 *
	 * @remarks
	 * Defaults to `active` — the panel is unmounted while closed, so reopening
	 * resets whatever state it held. `always` mounts it up front and `lazy` on
	 * first open; either way a closed panel then rests in
	 * `<Activity mode="hidden">` with its state preserved and effects torn down,
	 * dropping into the hold once the close animation lands.
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
}: CollapseProps) {
	const [currentOpen, setCurrentOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const open = currentOpen ?? false

	const toggle = useCallback(() => setCurrentOpen(!open), [open, setCurrentOpen])

	const { triggerProps, panelProps } = useA11yDisclosure({ expanded: open })

	// Held behind a stable identity. An inline arrow would otherwise be the one unstable
	// member of the context value, which the trigger and panel both read, so a memoized
	// subtree would re-render on every parent tick for a callback that never changed.
	// Raised only from the panel's landing, never during render.
	const reportOpenComplete = useEffectEvent(() => {
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
		[open, toggle, animateProp, mount, triggerProps, panelProps],
	)

	return (
		<CollapseContext value={value}>
			<div data-slot="collapse" data-open={dataAttr(open)} className={cn(k.base, className)}>
				{children}
			</div>
		</CollapseContext>
	)
}
