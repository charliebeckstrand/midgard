'use client'

import { FloatingFocusManager, type FloatingRootContext } from '@floating-ui/react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/popover'
import { PresencePortal } from '../portal'

/**
 * Props for {@link FloatingSurface}: the floating-ui positioning handles
 * (`setFloating`, `floatingStyles`, `getFloatingProps`), the `open` /
 * `onExitComplete` presence pair, and the optional `trapFocusContext`.
 */
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
 * Positioning shell shared by Tooltip, Popover, and Menu surfaces: owns the
 * positioned wrapper that receives the floating-ui reference over a
 * {@link PresencePortal}, which handles the teleport, the mount-while-open
 * lifecycle, and the exit animation. Consumers render the animated inner
 * surface as `children`.
 *
 * @remarks Passing `trapFocusContext` wraps the open surface in a modal
 * `FloatingFocusManager` that traps Tab; it cedes initial focus and close-time
 * restore to the consuming panel hook.
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
	const surface = (
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
	)

	return (
		<PresencePortal open={open} onExitComplete={onExitComplete}>
			{trapFocusContext ? (
				// `returnFocus={false}`: `useFloatingPanel`'s reason-aware effect owns
				// the close restore, as in DatePickerContent. `initialFocus={-1}`: the
				// surface owns initial focus (the month picker seats it on the selected
				// cell), so the manager must not race it to the first tabbable.
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
			)}
		</PresencePortal>
	)
}
