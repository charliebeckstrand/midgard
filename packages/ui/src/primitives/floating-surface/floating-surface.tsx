'use client'

import { FloatingFocusManager, FloatingPortal, type FloatingRootContext } from '@floating-ui/react'
import { AnimatePresence } from 'motion/react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
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

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
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
