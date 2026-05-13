'use client'

import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { Calendar } from '../calendar'
import { useControl } from '../control/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { DatePickerContent } from './content'
import { DatePickerFooter } from './footer'
import { DatePickerRange } from './range'
import { DatePickerTrigger } from './trigger'
import type { DatePickerBaseProps, DatePickerProps, DatePickerSingleProps } from './types'
import { useDatePickerState } from './use-state'

export type {
	DatePickerBaseProps,
	DatePickerProps,
	DatePickerRangeProps,
	DatePickerSingleProps,
} from './types'

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
	const { placeholder = 'Select a date', className, disabled = false } = props

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
