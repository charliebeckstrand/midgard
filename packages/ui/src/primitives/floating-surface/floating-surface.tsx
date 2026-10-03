'use client'

import {
	FloatingFocusManager,
	type FloatingFocusManagerProps,
	type FloatingRootContext,
} from '@floating-ui/react'
import {
	type ComponentProps,
	type CSSProperties,
	type ReactNode,
	useLayoutEffect,
	useRef,
} from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { useComposedRef } from '../../hooks'
import { k } from '../../recipes/kata/popover'
import { Density } from '../density'
import { Portal } from '../portal'

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
	/**
	 * Escape hatch: `FloatingFocusManager` props merged over the surface
	 * defaults, read only alongside `trapFocusContext`. Gate a conditional trap
	 * through `disabled` here, rather than by dropping `trapFocusContext`. The
	 * manager's presence decides the element type wrapping the surface, so
	 * withdrawing it mid-open remounts the live panel. A `disabled` manager
	 * renders neither guards nor listeners, leaving the DOM as it is untrapped.
	 */
	trapFocusProps?: Omit<FloatingFocusManagerProps, 'context' | 'children'>
	onExitComplete?: () => void
	/**
	 * The density step. Omit it to take the step of the scope of the place that
	 * opened the surface, which the portal carries. A step makes the surface a
	 * density scope: the portal host writes it as `data-density`, and the
	 * density context opens around the children.
	 */
	density?: DensityStep
	children: ReactNode
} & Omit<ComponentProps<'div'>, 'children'>

/**
 * Positioning shell shared by Tooltip, Popover, and Menu surfaces. It owns the
 * positioned wrapper that receives the floating-ui reference over a
 * {@link Portal}. That portal handles the teleport, the mount-while-open
 * lifecycle, and the exit animation. Consumers render the animated inner
 * surface as `children`.
 *
 * The portal carries the density scope and the direction of the trigger (see
 * {@link Portal}), so the surface follows the scope of its trigger.
 *
 * @remarks Passing `trapFocusContext` wraps the open surface in a modal
 * `FloatingFocusManager` that traps Tab. It cedes initial focus and close-time
 * restore to the consuming panel hook, which `trapFocusProps` overrides
 * per-surface.
 */
export function FloatingSurface({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	trapFocusContext,
	trapFocusProps,
	onExitComplete,
	density,
	className,
	style,
	children,
	ref,
	...rest
}: FloatingSurfaceProps) {
	const wrapperRef = useRef<HTMLDivElement | null>(null)

	const setWrapper = useComposedRef<HTMLDivElement>(wrapperRef, setFloating, ref)

	// A closed surface is still on screen through its exit animation, and one that
	// closed before the engine could place it — a menu panel the pointer swept
	// past — sits at the wrapper's unpositioned origin, over the surface it came
	// from. Either way it must stop taking input the moment it stops being real,
	// or it swallows the hovers and presses meant for what lies under it.
	//
	// Written to the node rather than rendered as a class: `AnimatePresence` holds
	// the exiting subtree at the props it had when it was last open, so a prop
	// keyed on `open` never reaches it. This effect runs on the parent's render,
	// where the node is still there to write to.
	useLayoutEffect(() => {
		const node = wrapperRef.current

		if (!node) return

		node.style.pointerEvents = open ? (style?.pointerEvents ?? '') : 'none'
	}, [open, style?.pointerEvents])

	const surface = (
		<div
			ref={setWrapper}
			style={style ? { ...floatingStyles, ...style } : floatingStyles}
			className={cn(k.portal, className)}
			// Routed through getFloatingProps so consumer handlers compose
			// with floating-ui's own instead of being overwritten.
			{...getFloatingProps(rest)}
		>
			{children}
		</div>
	)

	// `Density` sits above the portal, so an explicit step is the scope that the
	// portal host writes, and the children read the same step in context.
	return (
		<Density step={density}>
			<Portal open={open} onExitComplete={onExitComplete}>
				{trapFocusContext ? (
					// `returnFocus={false}`: `useFloatingPanel`'s reason-aware effect owns
					// the close restore, as in DatePickerContent. `initialFocus={-1}`: the
					// surface owns initial focus (the month picker seats it on the selected
					// cell), so the manager must not race it to the first tabbable. A
					// surface whose trap works the other way round — one that opens without
					// taking focus, like an interactive Tooltip — overrides both.
					<FloatingFocusManager
						context={trapFocusContext}
						modal
						returnFocus={false}
						initialFocus={-1}
						{...trapFocusProps}
					>
						{surface}
					</FloatingFocusManager>
				) : (
					surface
				)}
			</Portal>
		</Density>
	)
}
