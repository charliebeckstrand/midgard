'use client'

import { Calendar as CalendarIcon } from 'lucide-react'
import { type KeyboardEvent, type Ref, useRef } from 'react'

import { cn } from '../../core'
import { useIsTruncated } from '../../hooks'
import { ControlFrame } from '../../primitives'
import { iro } from '../../recipes'
import { k } from '../../recipes/kata/datepicker'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

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
	'data-group'?: string
	'data-group-orientation'?: string
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
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
}: DatePickerTriggerProps) {
	const glass = useGlass()

	const valueRef = useRef<HTMLSpanElement>(null)

	const isTruncated = useIsTruncated(valueRef, displayValue)

	const valueNode = (
		<span ref={valueRef} className={k.value}>
			{displayValue || <span className={cn(iro.text.muted)}>{placeholder}</span>}
		</span>
	)

	return (
		<div data-slot="control" ref={setReference} className={cn(className)} {...getReferenceProps()}>
			<ControlFrame
				data-open={open || undefined}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
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
					<Tooltip
						enabled={isTruncated && Boolean(displayValue)}
						className="min-w-0 flex-1 overflow-hidden"
					>
						<TooltipTrigger>{valueNode}</TooltipTrigger>
						<TooltipContent>{displayValue}</TooltipContent>
					</Tooltip>
					<span className={cn(k.icon)}>
						<Icon icon={<CalendarIcon />} size="sm" />
					</span>
				</button>
			</ControlFrame>
		</div>
	)
}
