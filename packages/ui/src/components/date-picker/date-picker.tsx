'use client'

import type { Placement } from '@floating-ui/react'
import type { ReactElement } from 'react'
import { composeEventHandlers } from '../../core'
import { useDensity } from '../../primitives/density'
import { Calendar } from '../calendar'
import type { ControlSize } from '../control/context'
import { DateInput, type DateInputFormat } from '../date-input'
import { DatePickerCalendarButton } from './date-picker-calendar-button'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerPeriod } from './date-picker-period'
import type { DatePickerPeriodConfig, DatePickerPeriodValue } from './date-picker-period-utilities'
import { DatePickerRange } from './date-picker-range'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerInputTab } from './use-date-picker-input-tab'
import { useDatePickerState } from './use-date-picker-state'

/** Single-date arm of {@link DatePickerProps} (`range` and `period` absent or `false`). */
export type DatePickerSingleProps = {
	range?: false
	period?: false
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
	period?: false
	value?: [Date, Date]
	defaultValue?: [Date, Date]
	onValueChange?: (value: [Date, Date] | undefined) => void
}

/**
 * Period arm of {@link DatePickerProps}; value is a multi-select
 * {@link DatePickerPeriodValue} of independent year / quarter / month sets.
 *
 * Pass `period` (bare `true`) for the defaults — selectable years of the prior
 * and current calendar year, all twelve months, quarters hidden — or a
 * {@link DatePickerPeriodConfig} to tune each facet. A facet takes an explicit
 * option list, `true` for its default set, or `false` to hide it.
 *
 * @example
 * ```tsx
 * <DatePicker period={{ years: [2024, 2025, 2026], quarters: false, months: true }} />
 * ```
 */
export type DatePickerPeriodProps = {
	period: true | DatePickerPeriodConfig
	range?: false
	value?: DatePickerPeriodValue
	defaultValue?: DatePickerPeriodValue
	onValueChange?: (value: DatePickerPeriodValue | undefined) => void
}

/**
 * Range-agnostic {@link DatePicker} props shared by both arms (single and
 * range); intersected with the discriminated value/handler shape in
 * {@link DatePickerProps}.
 */
export type DatePickerBaseProps = {
	/** Binds the value to an enclosing Form field. Seed `Form.defaultValues` with a `Date` (single), `[Date, Date]` (range), or a {@link DatePickerPeriodValue} (period). */
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
 * `size`, `truncate`, …) discriminated on `range`/`period` into single-`Date`,
 * `[Date, Date]`, or {@link DatePickerPeriodValue} value/handler shapes.
 */
export type DatePickerProps = DatePickerBaseProps &
	(DatePickerSingleProps | DatePickerRangeProps | DatePickerPeriodProps)

/**
 * Popover date picker; switches between single and range calendar selection on
 * the `range` prop, or a multi-select year/quarter/month filter on the `period`
 * prop, and supports controlled or uncontrolled `value`. `size` resolves through
 * the explicit prop, then `<Control>`, then Density, then `'md'`. With `input`, a
 * typed DateInput replaces the trigger and the calendar opens from its suffix
 * button.
 *
 * @remarks
 * In the calendar variants, keyboard navigation runs on a virtual highlight
 * rather than DOM focus: the open dialog itself holds focus and routes
 * arrow/Page keys to the active zone. `input` mode keeps the editable reference
 * group out of the modal trap's `aria-hidden` marking and closes its own Tab
 * cycle. The `period` variant instead uses real focusable toggle buttons shown
 * as chips in the trigger.
 *
 * @see {@link DatePickerProps} for the discriminated value/handler shapes.
 */
export function DatePicker(props: DatePickerProps) {
	const inherited = useDensity()

	const resolvedSize: ControlSize = props.size ?? inherited.size

	let picker: ReactElement

	if (props.period) {
		picker = <DatePickerPeriod {...props} size={resolvedSize} />
	} else if (props.range) {
		picker = <DatePickerRange {...props} size={resolvedSize} />
	} else {
		picker = <DatePickerSingle {...props} size={resolvedSize} />
	}

	// `display: contents` wrapper: while open, floating-ui's modal focus manager
	// imperatively inserts a hidden return-focus span as the reference's next
	// sibling (`domReference.insertAdjacentElement('afterend', …)`). Scoping that
	// span under this wrapper keeps the picker a single DOM child of its parent,
	// so a `space-y` container's `> :not(:last-child)` margin doesn't shift the
	// layout when the popover opens. `contents` adds no box of its own, so
	// flex/grid/block layout sees straight through to the control as before. One
	// wrapper here covers all three render paths (trigger, input, range).
	return (
		<div data-slot="datepicker" className="contents">
			{picker}
		</div>
	)
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
		? composeEventHandlers(inputTab.onDialogKeyDown, state.onTriggerKeyDown)
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
