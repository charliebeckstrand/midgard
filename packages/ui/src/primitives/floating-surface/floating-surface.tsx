'use client'

import { FloatingFocusManager, FloatingPortal, type FloatingRootContext } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import { type CSSProperties, type HTMLAttributes, type ReactNode, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/popover'
import { usePortalContainer } from '../portal'
import { ReducedMotion } from '../reduced-motion'

export type FloatingSurfaceProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	/**
	 * Floating-ui root context; when set, a modal `FloatingFocusManager`
	 * traps Tab inside the surface while open.
	 */
	trapFocusContext?: FloatingRootContext
	onExitComplete?: () => void
	className?: string
	style?: CSSProperties
	children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'style' | 'ref'>

/**
 * Portal + presence + positioning shell shared by Tooltip, Popover, and
 * Menu surfaces. Owns the `FloatingPortal`, `AnimatePresence`, and the
 * positioned wrapper that receives the floating-ui reference; consumers
 * render the animated inner surface as `children`.
 *
 * @remarks
 * Teleports through the `<UIProvider>`-resolved portal container
 * ({@link usePortalContainer}). Passing `trapFocusContext` wraps the open
 * surface in a modal `FloatingFocusManager` that traps Tab; it cedes initial
 * focus and close-time restore to the consuming panel hook. Mount/unmount runs
 * through `AnimatePresence` under {@link ReducedMotion}.
 */
export function FloatingSurface({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	trapFocusContext,
	onExitComplete,
	className,
	style,
	children,
	...rest
}: FloatingSurfaceProps) {
	const root = usePortalContainer()

	// Mount the portal only while open or animating out. A closed surface keeps no
	// portal node in the DOM, so a grid of N tooltips no longer leaves N empty
	// `[data-floating-ui-portal]` containers behind. `mounted` flips on with `open`
	// (adjusted during render) and off once the exit animation completes.
	const [mounted, setMounted] = useState(open)

	if (open && !mounted) setMounted(true)

	const surface = open ? (
		<div
			ref={setFloating}
			style={style ? { ...floatingStyles, ...style } : floatingStyles}
			className={cn(k.portal, className)}
			// Routed through getFloatingProps so consumer handlers compose
			// with floating-ui's own instead of being overwritten.
			{...getFloatingProps(rest)}
		>
			{children}
		</div>
	) : null

	if (!mounted) return null

	const handleExitComplete = () => {
		setMounted(false)

		onExitComplete?.()
	}

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={handleExitComplete}>
					{surface &&
						(trapFocusContext ? (
							// `returnFocus={false}`: `useFloatingPanel`'s reason-aware
							// effect owns the close restore, as in DatePickerContent.
							// `initialFocus={-1}`: the surface owns initial focus (the
							// month picker seats it on the selected cell), so the
							// manager must not race it to the first tabbable.
							<FloatingFocusManager
								context={trapFocusContext}
								modal
								returnFocus={false}
								initialFocus={-1}
							>
								{surface}
							</FloatingFocusManager>
						) : (
							surface
						))}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
