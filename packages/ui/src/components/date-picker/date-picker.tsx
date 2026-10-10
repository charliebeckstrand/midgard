'use client'

import type { ReactElement } from 'react'
import { cn, composeEventHandlers } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { FloatingPlacement } from '../../hooks'
import type { scale } from '../../recipes/kata/date-picker'
import { k } from '../../recipes/kata/date-picker'
import type { GroupStampProps } from '../../types/group-stamp'
import { Calendar } from '../calendar'
import { DateInput, type DateInputFormat } from '../date-input'
import { DateInputResetContext, useDateInputResets } from '../date-input/context'
import { DatePickerCalendarButton } from './date-picker-calendar-button'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerRange } from './date-picker-range'
import { DatePickerRelative } from './date-picker-relative'
import type {
	DatePickerRelativeConfig,
	DatePickerRelativeValue,
} from './date-picker-relative-utilities'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerInputTab } from './use-date-picker-input-tab'
import { useDatePickerState } from './use-date-picker-state'

/** Single-date arm of {@link DatePickerProps} (`range` and `relative` absent or `false`). */
export type DatePickerSingleProps = {
	/**
	 * Picks a `[Date, Date]` range in place of one date ({@link DatePickerRangeProps}).
	 * @defaultValue false
	 */
	range?: false
	/**
	 * Shows the relative presets in place of the calendar ({@link DatePickerRelativeProps}).
	 * @defaultValue false
	 */
	relative?: false
	value?: Date | null
	defaultValue?: Date
	onValueChange?: (value: Date | null) => void
	/**
	 * Renders a typed DateInput in place of the popover trigger. The calendar
	 * icon becomes a labeled suffix button that opens the calendar, and a
	 * picked date writes back into the input. Opening keeps focus on the input.
	 * ArrowDown opens, and the arrow keys then rove the grid through the input's
	 * `aria-activedescendant`. Enter commits the highlighted day.
	 * @defaultValue false
	 */
	input?: boolean
	/**
	 * Pattern for the typed date while `input` is set.
	 *
	 * @defaultValue `'MM/DD/YYYY'` in an `en-US` locale. The locale sets the
	 * layout, as on {@link DateInput}. The typed field then agrees with the
	 * Calendar and the trigger label.
	 */
	format?: DateInputFormat
}

/** Range arm of {@link DatePickerProps} (`range: true`); value is a `[Date, Date]` pair. */
export type DatePickerRangeProps = {
	range: true
	relative?: false
	value?: [Date, Date] | null
	defaultValue?: [Date, Date]
	onValueChange?: (value: [Date, Date] | null) => void
}

/**
 * Relative arm of {@link DatePickerProps}; value is always an array of resolved
 * {@link DatePickerRelativeValue} spans (`{ from, to }`).
 *
 * The popover opens to a list of relative presets ("Last 7 days", "This year",
 * …). Single-select by default — the array holds one span; picking another
 * preset replaces it and re-picking clears — while `relative={{ multiple: true }}`
 * lets several stack. A "Custom range" row swaps to Start/End date fields (typed
 * or calendar-picked) for an arbitrary absolute span, mutually exclusive with the
 * presets. Pass `relative` (bare `true`) for the built-in presets. Pass a
 * {@link DatePickerRelativeConfig} to override the list, enable `multiple`, or
 * turn the trigger's chips off.
 *
 * The trigger shows the selection as chips, which wrap and grow it a row at a
 * time. `chips: false` shows one line of text instead — the lone span's label,
 * or a `"N selected"` count past one — so the trigger keeps a control's height.
 *
 * @example
 * ```tsx
 * <DatePicker relative value={value} onValueChange={setValue} />
 * ```
 *
 * @example
 * ```tsx
 * <DatePicker relative={{ multiple: true, chips: false }} value={value} onValueChange={setValue} />
 * ```
 */
export type DatePickerRelativeProps = {
	relative: true | DatePickerRelativeConfig
	range?: false
	value?: DatePickerRelativeValue[] | null
	defaultValue?: DatePickerRelativeValue[]
	onValueChange?: (value: DatePickerRelativeValue[] | null) => void
}

/**
 * Footer-button toggles for {@link DatePicker}. Each flag defaults to `true`;
 * set one `false` to hide that button. `today` applies to the single-date
 * variant only — the range and relative variants have no Today shortcut, so it
 * is a no-op there.
 *
 * @example
 * ```tsx
 * <DatePicker footer={{ today: false }} /> // keep Clear, drop the Today shortcut
 * ```
 */
export type DatePickerFooterConfig = {
	/**
	 * Shows the "Today" shortcut in the calendar footer (single-date variant only).
	 *
	 * @defaultValue true
	 */
	today?: boolean
	/**
	 * Shows the "Clear" action in the calendar footer once a value is set.
	 *
	 * @defaultValue true
	 */
	clear?: boolean
}

/**
 * Range-agnostic {@link DatePicker} props shared by both arms (single and
 * range); intersected with the discriminated value/handler shape in
 * {@link DatePickerProps}.
 */
export type DatePickerBaseProps = GroupStampProps & {
	/** Binds the value to an enclosing Form field. Seed `Form.defaultValues` with a `Date` (single), `[Date, Date]` (range), or a {@link DatePickerRelativeValue}`[]` (relative). */
	name?: string
	/**
	 * Forwarded to the calendar. Fires with the first of the month the grid
	 * renders, whenever that month changes.
	 *
	 * Use it to fetch per-month data behind an open picker. The relative variant
	 * shows no grid until the reader opens a custom range, so it reports only from
	 * there.
	 */
	onMonthChange?: (month: Date) => void
	min?: Date
	max?: Date
	placeholder?: string
	/**
	 * The side and the alignment of the panel. A `<side>-auto` value aligns the panel to the
	 * edge of the trigger that is nearer to the edge of the viewport.
	 * @defaultValue 'bottom-start'
	 */
	placement?: FloatingPlacement
	/**
	 * The density step of the trigger padding, the text, the calendar icon, and
	 * the panel. Omit it to take the step of the nearest density scope. A step
	 * makes the trigger and the panel density scopes.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Truncates the date label when the parent is narrower than the trigger
	 * content. Set `false` to show the full label in that case.
	 *
	 * @defaultValue true
	 */
	truncate?: boolean
	/**
	 * Renders a clear button in place of the calendar icon once a value is set,
	 * matching the `clearable` affordance on Listbox/Combobox. In `input` mode the
	 * typed {@link DateInput} owns the clear button instead.
	 *
	 * @defaultValue false
	 */
	clearable?: boolean
	/**
	 * Toggles the calendar footer's action buttons. Each key defaults to `true`;
	 * set one `false` to hide that button — e.g. `footer={{ today: false }}` keeps
	 * Clear but drops the Today shortcut. Honored across variants, though `today`
	 * only renders in the single-date variant. The relative variant also gives it
	 * to the calendars of its Start and End fields.
	 *
	 * @defaultValue { today: true, clear: true }
	 */
	footer?: DatePickerFooterConfig
	className?: string
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	disabled?: boolean
	/**
	 * Keeps the trigger focusable and the value submitted, but blocks opening the
	 * calendar and changing the value. The trigger clear button does not show,
	 * and the typed `input` field is read-only. A controlled `open` still shows
	 * the calendar, but without the footer Clear and Today buttons.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
	/**
	 * Controlled calendar open state. Pair with `onOpenChange`.
	 * @defaultValue Uncontrolled: the state starts from `defaultOpen`.
	 */
	open?: boolean
	/**
	 * Initial calendar open state when uncontrolled.
	 * @defaultValue false
	 */
	defaultOpen?: boolean
	/** Fires when the calendar opens or closes (trigger, dismiss, Escape, selection). */
	onOpenChange?: (open: boolean) => void
	/** Accessible name for the trigger when no Field/Label wraps the picker. */
	'aria-label'?: string
}

/**
 * Props for {@link DatePicker}: the shared base (`name`, `min`/`max`, `placement`,
 * `size`, `truncate`, `footer`, …) discriminated on `range`/`relative` into
 * single-`Date`, `[Date, Date]`, or {@link DatePickerRelativeValue}`[]`
 * value/handler shapes.
 */
export type DatePickerProps = DatePickerBaseProps &
	(DatePickerSingleProps | DatePickerRangeProps | DatePickerRelativeProps)

/**
 * Popover date picker. It switches between single and range calendar selection
 * on the `range` prop, or a relative-range picker on the `relative` prop. The
 * relative picker is single-select by default, and multi-select with
 * `multiple: true`. It supports controlled or uncontrolled `value`. The picker takes
 * the step of the nearest density scope, and an explicit `size` opens a scope. With `input`, a
 * typed DateInput replaces the trigger and the calendar opens from its suffix
 * button. A `clearable` clear button replaces the calendar icon once a value is
 * set, mirroring Listbox/Combobox, which default it off as well.
 *
 * The trigger is as wide as its value and its calendar icon. It does not fill
 * its parent, and it does not get wider than its parent. Pass a `className`
 * such as `w-full` to make it fill the parent. With `input`, the DateInput
 * fills its parent, as an Input does.
 *
 * @remarks
 * In the calendar variants, keyboard navigation runs on a virtual highlight
 * rather than DOM focus. The open dialog itself holds focus, and routes
 * arrow/Page keys to the active zone. The `input` mode instead keeps DOM focus
 * on the editable DateInput on open. It drives the grid through the input's
 * `aria-activedescendant`, the active-descendant pattern, as on Combobox. A
 * keyboard user therefore never loses the field. It also keeps the reference
 * group out of the modal trap's `aria-hidden` marking, and closes its own Tab
 * cycle. The `relative` variant's preset list uses real focusable toggle
 * buttons, shown as chips in the trigger. It swaps to Start/End `input`-mode
 * date fields for a custom range.
 *
 * The trigger is a select-only combobox with a dialog popup, as on Listbox. Its
 * content is its value, so a screen reader announces the selected date after
 * the name from `aria-label` or a Field label.
 *
 * @see {@link DatePickerProps} for the discriminated value/handler shapes.
 */
export function DatePicker(props: DatePickerProps) {
	let picker: ReactElement

	if (props.relative) {
		picker = <DatePickerRelative {...props} />
	} else if (props.range) {
		picker = <DatePickerRange {...props} />
	} else {
		picker = <DatePickerSingle {...props} />
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
		size,
		truncate = true,
		input = false,
		format,
		clearable = false,
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const {
		triggerRef,
		inputRef,
		focusHomeRef,
		floatingRef,
		open,
		onTriggerKeyDown,
		setFloating,
		floatingStyles,
		getFloatingProps,
		context,
		listboxId,
		activeDescendantId,
		setReference,
		getReferenceProps,
		value,
		setValue,
		disabled,
		readOnly,
		invalid,
		inputAria,
		onOpenChange,
		triggerId,
		dialogId,
		describedBy,
		displayValue,
		required,
		validation,
		hasValue,
		onClear,
		calendar: { calendarRef, ...calendar },
		footer,
	} = useDatePickerState(props)

	// The DateInput gets no `name`, so the picker passes the reset count of its
	// Form down. A reset then drops the typed text, also when the value stays.
	const resets = useDateInputResets(props.name)

	const { onDialogKeyDown, onReferenceKeyDown } = useDatePickerInputTab({
		open: open,
		triggerRef: triggerRef,
		floatingRef: floatingRef,
	})

	// With `input`, the dialog's Tab edges hand focus back to the reference
	// group before the virtual model sees the key.
	const onContentKeyDown = input
		? composeEventHandlers(onDialogKeyDown, onTriggerKeyDown)
		: onTriggerKeyDown

	const content = (
		<DatePickerContent
			id={dialogId}
			open={open}
			setFloating={setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			context={context}
			size={size}
			onKeyDown={onContentKeyDown}
			// `input` mode seeds open-focus on the editable DateInput (not the dialog
			// container) so the user can type and the same keydown stream roves the
			// grid via the input's `aria-activedescendant`. The button-trigger variant
			// keeps the container-focus virtual-highlight default.
			initialFocusRef={focusHomeRef}
			// The reference group stays editable (and Tab-reachable via
			// useDatePickerInputTab) while open, so it must stay out of the modal
			// trap's aria-hidden marking. Non-input mode keeps the standard
			// dialog semantics: the closed trigger is hidden with the page.
			getInsideElements={input ? () => (triggerRef.current ? [triggerRef.current] : []) : undefined}
		>
			<Calendar
				ref={calendarRef}
				value={calendar.value}
				onDayPress={calendar.onDayPress}
				min={props.min}
				max={props.max}
				active={calendar.active}
				onMonthChange={props.onMonthChange}
				listboxId={listboxId}
				activeDescendantId={activeDescendantId}
			/>
			<DatePickerFooter {...footer} />
		</DatePickerContent>
	)

	if (input) {
		return (
			<DateInputResetContext value={resets}>
				<div
					data-slot="control"
					ref={setReference}
					className={cn(k.control, className)}
					{...getReferenceProps({ onKeyDown: onReferenceKeyDown })}
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
						{...inputAria}
						suffix={
							<DatePickerCalendarButton
								open={open}
								// readOnly blocks the open, but a controlled `open` can still close.
								disabled={disabled || (readOnly && !open)}
								onActivate={() => onOpenChange(!open)}
							/>
						}
						data-group={dataGroup}
						data-group-orientation={dataGroupOrientation}
					/>
				</div>
				{content}
			</DateInputResetContext>
		)
	}

	return (
		<>
			<DatePickerTrigger
				open={open}
				onOpenChange={onOpenChange}
				triggerId={triggerId}
				dialogId={dialogId}
				describedBy={describedBy}
				setReference={setReference}
				getReferenceProps={getReferenceProps}
				displayValue={displayValue}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
				validation={validation}
				onKeyDown={onTriggerKeyDown}
				clearable={clearable}
				hasValue={hasValue}
				onClear={onClear}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
			{content}
		</>
	)
}
