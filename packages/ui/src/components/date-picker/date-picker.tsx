'use client'

import type { Placement } from '@floating-ui/react'
import type { KeyboardEvent } from 'react'
import { useDensity } from '../../primitives/density'
import { Calendar } from '../calendar'
import type { ControlSize } from '../control/context'
import { DateInput, type DateInputFormat } from '../date-input'
import { DatePickerCalendarButton } from './date-picker-calendar-button'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerRange } from './date-picker-range'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerInputTab } from './use-date-picker-input-tab'
import { useDatePickerState } from './use-date-picker-state'

/** Single-date arm of {@link DatePickerProps} (`range` absent or `false`). */
export type DatePickerSingleProps = {
	range?: false
	value?: Date
	defaultValue?: Date
	onValueChange?: (value: Date | undefined) => void
	/**
	 * Renders a typed DateInput in place of the popover trigger. The calendar
	 * icon becomes a labeled suffix button that opens the calendar, and a
	 * picked date writes back into the input.
	 */
	input?: boolean
	/**
	 * Pattern for the typed date while `input` is set.
	 *
	 * @defaultValue 'MM/DD/YYYY'
	 */
	format?: DateInputFormat
}

/** Range arm of {@link DatePickerProps} (`range: true`); value is a `[Date, Date]` pair. */
export type DatePickerRangeProps = {
	range: true
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onValueChange?: (value: [Date, Date] | undefined) => void
}

/**
 * Range-agnostic {@link DatePicker} props shared by both arms (single and
 * range); intersected with the discriminated value/handler shape in
 * {@link DatePickerProps}.
 */
export type DatePickerBaseProps = {
	/** Binds the value to an enclosing Form field. Seed `Form.defaultValues` with a `Date` (single) or `[Date, Date]` (range). */
	name?: string
	min?: Date
	max?: Date
	placeholder?: string
	placement?: Placement
	/**
	 * Size step that drives trigger padding, text size, and the calendar icon.
	 * Resolution order: explicit prop, then `<Control>`, then enclosing Density size, then `'md'`.
	 */
	size?: ControlSize
	/**
	 * Truncates the displayed date label when it overflows the trigger.
	 * Set `false` to let the trigger grow to fit its content, e.g. inside a
	 * `<Group>` or another content-sized parent that collapses the label.
	 *
	 * @defaultValue true
	 */
	truncate?: boolean
	className?: string
	disabled?: boolean
	/** Accessible name for the trigger when no Field/Label wraps the picker. */
	'aria-label'?: string
	'data-group'?: string
	'data-group-orientation'?: string
}

/**
 * Props for {@link DatePicker}: the shared base (`name`, `min`/`max`, `placement`,
 * `size`, `truncate`, …) discriminated on `range` into single-`Date` or
 * `[Date, Date]` value/handler shapes.
 */
export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps)

/**
 * Popover date picker wrapping a Calendar; switches between single and range
 * selection on the `range` prop, and supports controlled or uncontrolled `value`.
 * `size` resolves through the explicit prop, then `<Control>`, then Density, then `'md'`.
 * With `input`, a typed DateInput replaces the trigger and the calendar opens
 * from its suffix button.
 *
 * @remarks
 * Keyboard navigation runs on a virtual highlight rather than DOM focus: the
 * open dialog itself holds focus and routes arrow/Page keys to the active zone.
 * `input` mode keeps the editable reference group out of the modal trap's
 * `aria-hidden` marking and closes its own Tab cycle.
 *
 * @see {@link DatePickerProps} for the discriminated value/handler shapes.
 */
export function DatePicker(props: DatePickerProps) {
	const inherited = useDensity()

	const resolvedSize: ControlSize = props.size ?? inherited.size

	if (props.range) {
		return <DatePickerRange {...props} size={resolvedSize} />
	}

	return <DatePickerSingle {...props} size={resolvedSize} />
}

function DatePickerSingle(props: DatePickerBaseProps & DatePickerSingleProps) {
	const {
		placeholder = 'Select a date',
		size = 'md',
		truncate = true,
		input = false,
		format = 'MM/DD/YYYY',
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerState(props)

	const inputTab = useDatePickerInputTab({
		open: state.open,
		triggerRef: state.triggerRef,
		floatingRef: state.floatingRef,
	})

	// With `input`, the dialog's Tab edges hand focus back to the reference
	// group before the virtual model sees the key.
	const onContentKeyDown = input
		? (e: KeyboardEvent<HTMLElement>) => {
				inputTab.onDialogKeyDown(e)

				if (!e.defaultPrevented) state.onTriggerKeyDown(e)
			}
		: state.onTriggerKeyDown

	const content = (
		<DatePickerContent
			open={state.open}
			setFloating={state.setFloating}
			floatingStyles={state.floatingStyles}
			getFloatingProps={state.getFloatingProps}
			context={state.context}
			size={size}
			onKeyDown={onContentKeyDown}
			// The reference group stays editable (and Tab-reachable via
			// useDatePickerInputTab) while open, so it must stay out of the modal
			// trap's aria-hidden marking. Non-input mode keeps the standard
			// dialog semantics: the closed trigger is hidden with the page.
			getInsideElements={
				input ? () => (state.triggerRef.current ? [state.triggerRef.current] : []) : undefined
			}
		>
			<Calendar
				ref={state.calendar.calendarRef}
				value={state.calendar.value}
				onValueChange={state.calendar.onValueChange}
				min={props.min}
				max={props.max}
				active={state.calendar.active}
				footerRef={state.calendar.footerRef}
			/>
			<DatePickerFooter {...state.footer} />
		</DatePickerContent>
	)

	if (input) {
		return (
			<>
				<div
					data-slot="control"
					ref={state.setReference}
					className={className}
					{...state.getReferenceProps({ onKeyDown: inputTab.onReferenceKeyDown })}
				>
					<DateInput
						data-slot="datepicker-input"
						value={state.value ?? null}
						onValueChange={state.setValue}
						format={format}
						min={props.min}
						max={props.max}
						size={size}
						disabled={state.disabled}
						placeholder={props.placeholder}
						aria-label={ariaLabel}
						suffix={
							<DatePickerCalendarButton
								open={state.open}
								disabled={state.disabled}
								onActivate={() => state.onOpenChange(!state.open)}
							/>
						}
						data-group={dataGroup}
						data-group-orientation={dataGroupOrientation}
					/>
				</div>
				{content}
			</>
		)
	}

	return (
		<>
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.displayValue}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={state.disabled}
				required={state.required}
				invalid={state.invalid}
				onKeyDown={state.onTriggerKeyDown}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
			{content}
		</>
	)
}
