'use client'

import { FloatingFocusManager, FloatingPortal, type FloatingRootContext } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { type CSSProperties, type KeyboardEvent, type ReactNode, useRef } from 'react'

import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/date-picker'
import { Box } from '../box'
import type { ControlSize } from '../control/context'

// Keys the virtual model navigates with; see the dialog's onKeyDown below.
const NAVIGATION_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'PageUp',
	'PageDown',
])

type DatePickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: (userProps?: Record<string, unknown>) => Record<string, unknown>
	context: FloatingRootContext
	/**
	 * Resolved size from `<DatePicker>`, re-broadcast via `<Density>`. The
	 * `FloatingPortal` teleports outside the density chain, where `<Calendar>`
	 * and `<DatePickerFooter>` fall back to `'md'` regardless of the trigger's
	 * size.
	 */
	size: ControlSize
	/**
	 * The picker's virtual-focus key handler (zones + active highlight). It
	 * lives on the trigger and, via this prop, on the dialog itself; initial
	 * focus lands on the dialog, not its first tabbable button, and the model
	 * keeps working once a real browser moves focus into the modal trap.
	 */
	onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void
	/**
	 * Elements spared from the modal trap's outside marking. While open,
	 * `FloatingFocusManager` stamps `aria-hidden` on everything outside the
	 * floating element — including the reference. `input` mode passes its
	 * reference group here so the DateInput being edited stays visible to AT;
	 * the rest of the page remains hidden.
	 */
	getInsideElements?: () => Element[]
	onExitComplete?: () => void
	children: ReactNode
}

export function DatePickerContent({
	open,
	setFloating,
	floatingStyles,
	getFloatingProps,
	context,
	size,
	onKeyDown,
	getInsideElements,
	onExitComplete,
	children,
}: DatePickerContentProps) {
	const glass = useGlass()

	const root = usePortalContainer()

	// Focus lands on the dialog container (tabIndex -1) instead of floating-ui's
	// default, the first tabbable, i.e. the "Previous month" button. The picker
	// uses a virtual highlight; seeding DOM focus on a button both misleads AT
	// and orphans the arrow-key model.
	const initialFocusRef = useRef<HTMLElement | null>(null)

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						// `returnFocus={false}`: `useFloatingUI`'s `returnFocusTo` restores
						// focus on Escape or selection but not on an outside-press
						// dismiss, where focus follows the pointer.
						<FloatingFocusManager
							context={context}
							modal
							returnFocus={false}
							initialFocus={initialFocusRef}
							getInsideElements={getInsideElements}
						>
							<div
								ref={(node) => {
									setFloating(node)

									initialFocusRef.current = node
								}}
								role="dialog"
								aria-modal="true"
								aria-label="Choose date"
								style={floatingStyles}
								className={cn(k.content.portal)}
								tabIndex={-1}
								{...getFloatingProps({
									// Composed through floating-ui; its own handlers merge
									// rather than clobber.
									onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
										// Keys from portaled descendants (the month/year picker
										// popover) bubble here through the React tree, not the
										// DOM. That surface owns its keyboard; acting here would
										// drive the calendar underneath it.
										if (e.target instanceof Node && !e.currentTarget.contains(e.target)) return

										// Activation keys on a DOM-focused control (the user Tabbed
										// to a header/footer button) belong to that control; only
										// the dialog itself routes them to the virtual model.
										if ((e.key === 'Enter' || e.key === ' ') && e.target !== e.currentTarget) return

										// Navigation keys belong to the virtual model even when the
										// user has Tabbed onto a control inside. Reclaim DOM focus
										// for the dialog first: a grid move can re-anchor the month
										// and unmount the focused day button, dropping focus to
										// <body>.
										if (NAVIGATION_KEYS.has(e.key) && e.target !== e.currentTarget) {
											e.currentTarget.focus()
										}

										onKeyDown?.(e)
									},
								})}
							>
								<motion.div
									{...k.content.motion}
									data-slot="datepicker-content"
									data-size={size}
									className={cn('z-50', k.content.text, glass && k.content.glass)}
									onMouseDown={(e) => e.preventDefault()}
								>
									<Density scale={size}>
										<Box
											bg={glass ? 'none' : 'popover'}
											outline={glass || undefined}
											radius="lg"
											className={k.content.body({ density: size })}
										>
											{children}
										</Box>
									</Density>
								</motion.div>
							</div>
						</FloatingFocusManager>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
