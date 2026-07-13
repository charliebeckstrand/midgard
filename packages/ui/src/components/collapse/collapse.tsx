'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useControllable } from '../../hooks/use-controllable'
import { k } from '../../recipes/kata/collapse'
import { CollapseContext } from './context'

/** Props for {@link Collapse}. */
export type CollapseProps = {
	/** @defaultValue false */
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Animation style for the panel. `true` or `'fade'` for height + opacity,
	 * `'slide'` for height only, `false` to disable.
	 * @defaultValue 'fade'
	 */
	animate?: boolean | 'fade' | 'slide'
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
	animate: animateProp = 'fade',
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

	const value = useMemo(
		() => ({ open, toggle, animate: animateProp, triggerProps, panelProps }),
		[open, toggle, animateProp, triggerProps, panelProps],
	)

	return (
		<CollapseContext value={value}>
			<div data-slot="collapse" data-open={dataAttr(open)} className={cn(k.base, className)}>
				{children}
			</div>
		</CollapseContext>
	)
}
