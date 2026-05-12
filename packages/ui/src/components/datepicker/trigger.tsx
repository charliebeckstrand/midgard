'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import type { KeyboardEvent, Ref } from 'react'

import { cn } from '../../core'
import { ControlFrame } from '../../primitives'
import { iro } from '../../recipes'
import { k } from '../../recipes/kata/datepicker'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'

export type DatePickerTriggerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	triggerRef?: Ref<HTMLButtonElement>
	setReference: (node: HTMLElement | null) => void
	getReferenceProps: () => Record<string, unknown>
	displayValue: string
	placeholder: string
	disabled?: boolean
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
	className?: string
}

export function DatePickerTrigger({
	open,
	onOpenChange,
	triggerId,
	triggerRef,
	setReference,
	getReferenceProps,
	displayValue,
	placeholder,
	disabled = false,
	onKeyDown,
	className,
}: DatePickerTriggerProps) {
	const glass = useGlass()

	return (
		<div data-slot="control" ref={setReference} className={cn(className)} {...getReferenceProps()}>
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
					onKeyDown={onKeyDown}
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
	)
}
