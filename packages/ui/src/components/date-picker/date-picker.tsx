'use client'

import type { Placement } from '@floating-ui/react'
import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { Calendar } from '../calendar'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerRange } from './date-picker-range'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerState } from './use-date-picker-state'

export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onValueChange?: (value: Date | undefined) => void
}

export type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onValueChange?: (value: [Date, Date] | undefined) => void
}

export type DatePickerBaseProps = {
	min?: Date
	max?: Date
	placeholder?: string
	placement?: Placement
	className?: string
	disabled?: boolean
	'data-group'?: string
	'data-group-orientation'?: string
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)

export function DatePicker(props: DatePickerProps) {
	const control = useControl()
	const skeleton = useSkeleton()

	if (skeleton) {
		const size = control?.size ?? 'md'

		return (
			<Placeholder
				className={cn(kokkaku.formControl.base, kokkaku.formControl.size[size], props.className)}
			/>
		)
	}

	if (props.range) {
		return <DatePickerRange {...props} />
	}

	return <DatePickerSingle {...props} />
}

function DatePickerSingle(props: DatePickerBaseProps & DatePickerSingleProps) {
	const {
		placeholder = 'Select a date',
		className,
		disabled = false,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerState(props)

	return (
		<>
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.displayValue}
				placeholder={placeholder}
				disabled={disabled}
				onKeyDown={state.onTriggerKeyDown}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
			<DatePickerContent
				open={state.open}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				focusTrapRef={state.focusTrapRef}
			>
				<Calendar
					ref={state.calendar.calendarRef}
					value={state.calendar.value}
					onChange={state.calendar.onChange}
					min={props.min}
					max={props.max}
					active={state.calendar.active}
					footerRef={state.calendar.footerRef}
				/>
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</>
	)
}
