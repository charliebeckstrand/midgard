'use client'

import { FloatingPortal } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode, Ref } from 'react'

import { cn } from '../../core'
import { Density } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { iro, omote, ugoki } from '../../recipes'
import { popover as kPopover } from '../../recipes/waku/popover'
import { Box } from '../box'
import type { ControlSize } from '../control/context'
import { useGlass } from '../glass/context'

export type DatePickerContentProps = {
	open: boolean
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: CSSProperties
	getFloatingProps: () => Record<string, unknown>
	focusTrapRef: Ref<HTMLDivElement>
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
	focusTrapRef,
	size,
	onExitComplete,
	children,
}: DatePickerContentProps) {
	const glass = useGlass()

	return (
		<FloatingPortal>
			<ReducedMotion>
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div
							ref={setFloating}
							style={floatingStyles}
							className={kPopover.portal}
							tabIndex={-1}
							{...getFloatingProps()}
						>
							<motion.div
								ref={focusTrapRef}
								{...ugoki.popover}
								data-slot="datepicker-content"
								data-step={size}
								className={cn('z-50', iro.text.default, glass && omote.glass)}
								onMouseDown={(e) => e.preventDefault()}
							>
								<Density density={size} size={size}>
									<Box bg={glass ? 'none' : 'popover'} outline={glass || undefined} radius="lg">
										{children}
									</Box>
								</Density>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</FloatingPortal>
	)
}
