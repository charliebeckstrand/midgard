'use client'

import { FloatingFocusManager, FloatingPortal, type FloatingRootContext } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { usePortalContainer } from '../../primitives/portal'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/date-picker'
import { Box } from '../box'
import type { ControlSize } from '../control/context'

type DatePickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: () => Record<string, unknown>
	context: FloatingRootContext
	/**
	 * Resolved size from `<DatePicker>`. Re-broadcast via `<Density>` because
	 * the FloatingPortal teleports out of the density chain — without this,
	 * `<Calendar>` and `<DatePickerFooter>` inside would fall back to `'md'`
	 * even when the trigger renders at `sm` / `lg`.
	 */
	size: ControlSize
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
	onExitComplete,
	children,
}: DatePickerContentProps) {
	const glass = useGlass()

	const root = usePortalContainer()

	return (
		<FloatingPortal root={root ?? undefined}>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						// `returnFocus={false}`: focus restoration is driven from
						// `useDatePickerState` so the trigger is only refocused on Escape or
						// selection — not when the panel is dismissed by an outside press.
						<FloatingFocusManager context={context} modal returnFocus={false}>
							<div
								ref={setFloating}
								role="dialog"
								aria-modal="true"
								aria-label="Choose date"
								style={floatingStyles}
								className={k.content.portal}
								tabIndex={-1}
								{...getFloatingProps()}
							>
								<motion.div
									{...k.content.motion}
									data-slot="datepicker-content"
									data-size={size}
									className={cn('z-50', k.content.text, glass && k.content.glass)}
									onMouseDown={(e) => e.preventDefault()}
								>
									<Density scale={size}>
										<Box bg={glass ? 'none' : 'popover'} outline={glass || undefined} radius="lg">
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
