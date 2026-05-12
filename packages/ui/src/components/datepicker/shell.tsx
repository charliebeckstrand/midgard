'use client'

import { FloatingPortal, type Placement } from '@floating-ui/react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { KeyboardEvent, ReactNode, Ref } from 'react'

import { cn } from '../../core'
import { useFloatingUI } from '../../hooks'
import { useFocusTrap } from '../../hooks/use-focus-trap'
import { ControlFrame, ReducedMotion } from '../../primitives'
import { iro, omote, ugoki } from '../../recipes'
import { k } from '../../recipes/kata/datepicker'
import { popover as kPopover } from '../../recipes/kata/popover'
import { Box } from '../box'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'

/**
 * The Calendar's internal month/year picker uses its own Popover, which
 * restores focus to its own trigger on close. Datepicker keeps focus inside
 * the focus trap, so the open-change hook is intentionally a no-op.
 */
export const noopPickerOpenChange = (_pickerOpen: boolean) => {}

export type DatePickerShellProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	placement?: Placement
	triggerId?: string
	triggerRef?: Ref<HTMLButtonElement>
	displayValue: string
	placeholder: string
	disabled?: boolean
	onTriggerKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	className?: string
	onExitComplete?: () => void
	children: ReactNode
}

/**
 * Shared trigger + floating-panel scaffold for the single and range
 * datepickers. Owns the floating-UI wiring, focus trap, and glass-aware
 * surface chrome; callers supply the calendar body (and optional footer) as
 * children, plus the value of the trigger label and a keyboard handler.
 */
export function DatePickerShell({
	open,
	onOpenChange,
	placement = 'bottom-start',
	triggerId,
	triggerRef,
	displayValue,
	placeholder,
	disabled = false,
	onTriggerKeyDown,
	className,
	onExitComplete,
	children,
}: DatePickerShellProps) {
	const glass = useGlass()

	const focusTrapRef = useFocusTrap(open)

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange,
		offset: 8,
		role: 'dialog',
	})

	return (
		<>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<ControlFrame
					data-open={open || undefined}
					className={cn('', k.control[glass ? 'glass' : 'default'])}
				>
					<button
						ref={triggerRef}
						type="button"
						id={triggerId}
						aria-haspopup="dialog"
						aria-expanded={open}
						data-slot="datepicker-button"
						disabled={disabled}
						onClick={() => onOpenChange(!open)}
						onKeyDown={onTriggerKeyDown}
						className={cn(k.button)}
					>
						<span className={k.value}>
							{displayValue || <span className={cn(iro.text.muted)}>{placeholder}</span>}
						</span>
						<span className={cn(k.icon)}>
							<Icon icon={<CalendarIcon />} size="sm" />
						</span>
					</button>
				</ControlFrame>
			</div>

			<FloatingPortal>
				<ReducedMotion>
					<AnimatePresence onExitComplete={onExitComplete}>
						{open && (
							<div
								ref={refs.setFloating}
								style={floatingStyles}
								className={kPopover.portal}
								tabIndex={-1}
								{...getFloatingProps()}
							>
								<motion.div
									ref={focusTrapRef}
									{...ugoki.popover}
									data-slot="datepicker-content"
									className={cn('z-50', iro.text.default, glass && omote.glass)}
									onMouseDown={(e) => e.preventDefault()}
								>
									<Box bg={glass ? 'none' : 'popover'} outline={glass || undefined} radius="lg">
										{children}
									</Box>
								</motion.div>
							</div>
						)}
					</AnimatePresence>
				</ReducedMotion>
			</FloatingPortal>
		</>
	)
}
