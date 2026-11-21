'use client'

import type { FocusEvent } from 'react'
import { cn } from '../../core/cn'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/date-picker'
import { Calendar } from '../calendar'
import { DateInput } from '../date-input'
import { DateInputResetContext, useDateInputResets } from '../date-input/context'
import type { DatePickerBaseProps, DatePickerSingleProps } from './date-picker'
import { DatePickerCalendarButton } from './date-picker-calendar-button'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { datePickerMessages } from './date-picker-messages'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerInputTab } from './use-date-picker-input-tab'
import { useDatePickerSheet } from './use-date-picker-sheet'
import { useDatePickerState } from './use-date-picker-state'

/**
 * Single-date arm of {@link DatePicker}: one date, from the calendar of a
 * trigger, or typed in `input` mode. `DatePicker` renders it when neither
 * `range` nor `relative` is set, and the relative arm renders it for its
 * custom Start and End fields.
 *
 * @internal
 */
export function DatePickerSingle(props: DatePickerBaseProps & DatePickerSingleProps) {
	const {
		placeholder,
		size,
		truncate = true,
		input = false,
		format,
		clearable = false,
		className,
		'aria-label': ariaLabel,
	} = props

	const intl = useIntl()

	const state = useDatePickerState(props)

	const {
		triggerRef,
		inputRef,
		focusHomeRef,
		floatingRef,
		open,
		onTriggerKeyDown,
		listboxId,
		activeDescendantId,
		setReference,
		getReferenceProps,
		value,
		setValue,
		setTouched,
		disabled,
		readOnly,
		invalid,
		inputProps,
		onOpenChange,
		displayValue,
		pending,
		calendar: { calendarRef, ...calendar },
		footer,
	} = state

	// The DateInput gets no `name`, so the picker passes the reset count of its
	// Form down. A reset then drops the typed text, also when the value stays.
	const resets = useDateInputResets(props.name)

	const sheet = useDatePickerSheet(props.sheet)

	const { onDialogKeyDown, onReferenceKeyDown } = useDatePickerInputTab({
		open: open,
		triggerRef: triggerRef,
		floatingRef: floatingRef,
	})

	// With `input`, the dialog's Tab edges hand focus back to the reference
	// group before the virtual model sees the key. The sheet is modal and covers
	// the reference, so its Tab cycle stays in the sheet.
	const handleContentKeyDown =
		input && !sheet ? composeEventHandlers(onDialogKeyDown, onTriggerKeyDown) : onTriggerKeyDown

	const getTriggerElements = () => (triggerRef.current ? [triggerRef.current] : [])

	// The DateInput gets no `name`, so its own touched mark reaches no field. A
	// blur that takes the focus out of the reference group is the blur of the
	// field. While the calendar is open, the focus can go into the dialog, and the
	// close marks the field touched.
	const handleGroupBlur = (event: FocusEvent<HTMLDivElement>) => {
		if (open || event.currentTarget.contains(event.relatedTarget as Node | null)) return

		setTouched()
	}

	const content = (
		<DatePickerContent
			state={state}
			size={size}
			sheet={sheet}
			footer={<DatePickerFooter {...footer} />}
			onKeyDown={handleContentKeyDown}
			// `input` mode seeds open-focus on the editable DateInput (not the dialog
			// container) so the user can type and the same keydown stream roves the
			// grid via the input's `aria-activedescendant`. The button-trigger variant
			// keeps the container-focus virtual-highlight default.
			initialFocusRef={focusHomeRef}
			// The reference group stays editable (and Tab-reachable via
			// useDatePickerInputTab) while open, so it must stay out of the modal
			// trap's aria-hidden marking. Non-input mode keeps the standard
			// dialog semantics: the closed trigger is hidden with the page.
			getInsideElements={input ? getTriggerElements : undefined}
		>
			<Calendar
				ref={calendarRef}
				value={calendar.value}
				onDayClick={calendar.onDayClick}
				min={props.min}
				max={props.max}
				active={calendar.active}
				onMonthChange={props.onMonthChange}
				listboxId={listboxId}
				activeDescendantId={activeDescendantId}
			/>
		</DatePickerContent>
	)

	if (input) {
		return (
			<DateInputResetContext value={resets}>
				<div
					data-slot="control"
					ref={setReference}
					className={cn(k.control, className)}
					{...getReferenceProps({ onKeyDown: onReferenceKeyDown, onBlur: handleGroupBlur })}
				>
					<DateInput
						ref={inputRef}
						data-slot="datepicker-input"
						value={value ?? null}
						onValueChange={setValue}
						format={format}
						min={props.min}
						max={props.max}
						size={size}
						disabled={disabled}
						readOnly={readOnly}
						// A field or Control error marks the input. Without one, `undefined`
						// lets DateInput report its own typed-entry error.
						invalid={invalid || undefined}
						clearable={clearable}
						placeholder={props.placeholder}
						aria-label={ariaLabel}
						// Focus stays on the input while the calendar is open, so the same
						// keydown stream drives the grid highlight; DateInput composes this
						// ahead of its own Enter-to-commit, which a handled key skips.
						onKeyDown={onTriggerKeyDown}
						{...inputProps}
						suffix={
							<DatePickerCalendarButton
								open={open}
								// readOnly blocks the open, but a controlled `open` can still close.
								disabled={disabled || (readOnly && !open)}
								onActivate={() => onOpenChange(!open)}
							/>
						}
					/>
				</div>
				{content}
			</DateInputResetContext>
		)
	}

	return (
		<>
			<DatePickerTrigger
				state={state}
				displayValue={displayValue}
				pending={pending}
				placeholder={placeholder ?? intl.formatMessage(datePickerMessages.selectDate)}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				clearable={clearable}
				className={className}
			/>
			{content}
		</>
	)
}
