'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/date-picker'
import { Badge } from '../badge'
import { Button } from '../button'
import { DateInputResetContext, useDateInputResets } from '../date-input/context'
import { Field, Label } from '../fieldset'
import { Icon } from '../icon'
// Sibling variant reused for the custom range's Start/End fields; safe despite the
// import cycle since both are hoisted function declarations used only at render.
import { DatePicker, type DatePickerBaseProps, type DatePickerRelativeProps } from './date-picker'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { relativeListRows } from './date-picker-relative-utilities'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerRelativeState } from './use-date-picker-relative-state'

/**
 * Relative variant of {@link DatePicker}: a multi-select list of relative-range
 * presets, plus a mutually-exclusive "Custom range" row that swaps the popover
 * to Start/End date fields. Each field is an `input`-mode picker — type or pick
 * from a calendar. The live selection shows as chips in the trigger — or as a one-line
 * summary under `chips: false` — and commits an array of `{ from, to }` spans.
 * Rendered by `DatePicker` when `relative` is set.
 *
 * @internal
 */
export function DatePickerRelative(props: DatePickerBaseProps & DatePickerRelativeProps) {
	const {
		placeholder = 'Select range',
		size,
		truncate = true,
		clearable = false,
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerRelativeState(props)

	// The custom Start and End pickers get no `name`, so the relative picker
	// passes the reset count of its Form down to their typed fields.
	const resets = useDateInputResets(props.name)

	// Row count that splits the presets plus the trailing custom row into two
	// balanced, column-major columns (see the `relative.list` recipe): the leading
	// half fills the first column, the rest the second.
	const rows = relativeListRows(state.presets.length + 1)

	// The chip row owns the trigger's value area and wraps, so each chip that does
	// not fit grows the trigger a row taller. Leaving it undefined — for `chips:
	// false`, or for a selection with nothing to draw — hands the area back to the
	// trigger's own text label, which holds one line: the `summary` below, or the
	// placeholder the trigger falls back to when that summary is empty.
	const chipRow =
		state.showChips && state.chips.length > 0 ? (
			// A slot scope, so each chip is one step below the trigger.
			<span data-density="slot" className={cn(k.relative.chips, 'flex-1')}>
				{state.chips.map((chip) => (
					<Badge key={chip.key} className="shrink-0 whitespace-nowrap">
						{chip.label}
					</Badge>
				))}
			</span>
		) : undefined

	return (
		<DateInputResetContext value={resets}>
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				dialogId={state.dialogId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				displayValue={state.summary}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={state.disabled}
				readOnly={state.readOnly}
				required={state.required}
				validation={state.validation}
				onKeyDown={state.onTriggerKeyDown}
				clearable={clearable}
				hasValue={state.hasValue}
				onClear={state.onClear}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			>
				{chipRow}
			</DatePickerTrigger>
			<DatePickerContent
				id={state.dialogId}
				open={state.open}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				context={state.context}
				size={size}
				onKeyDown={state.onContentKeyDown}
				onExitComplete={state.onExitComplete}
				label={state.mode === 'custom' ? 'Custom range' : 'Select range'}
			>
				{state.mode === 'list' ? (
					<div
						className={cn(k.relative.list)}
						// Pins the column-major row count; static recipe classes can't
						// carry a data-dependent track count.
						style={{ gridTemplateRows: `repeat(${rows}, minmax(0, auto))` }}
					>
						{state.presets.map((preset) => {
							const selected = state.selectedIds.has(preset.id)

							return (
								<Button
									key={preset.id}
									type="button"
									variant={selected ? 'solid' : 'bare'}
									color={selected ? 'blue' : 'zinc'}
									aria-pressed={selected}
									data-relative-preset={preset.id}
									className={cn(k.relative.preset)}
									onClick={() => state.togglePreset(preset)}
								>
									{preset.label}
								</Button>
							)
						})}
						<Button
							type="button"
							variant={state.customActive ? 'solid' : 'bare'}
							color={state.customActive ? 'blue' : 'zinc'}
							aria-pressed={state.customActive}
							data-relative-custom=""
							className={cn(k.relative.custom.row)}
							onClick={state.enterCustom}
						>
							Custom range
							<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />
						</Button>
					</div>
				) : (
					<div className={cn(k.relative.custom.panel)}>
						<Button
							type="button"
							variant="bare"
							className={cn(k.relative.custom.back)}
							onClick={state.backToList}
						>
							<Icon icon={<ArrowLeft />} className="rtl:-scale-x-100" />
							Back to presets
						</Button>
						{/* Each field is a single-date picker in `input` mode: a typed
					    DateInput whose suffix button opens a calendar. The popover
					    preventDefaults mousedown to hold DOM focus on the dialog for
					    the calendar variants' virtual model. Stop mousedown here, so a
					    click focuses the input. `clearable` is off so the suffix —
					    and thus the field width — stays fixed as a date is entered.
					    Each field takes the root `footer`, so a footer button that
					    the author removes does not show in the field calendars. */}
						<Field onMouseDown={(event) => event.stopPropagation()}>
							<Label>Start</Label>
							<DatePicker
								input
								clearable={false}
								value={state.custom.start ?? undefined}
								onValueChange={state.custom.onStartChange}
								readOnly={state.readOnly}
								onMonthChange={props.onMonthChange}
								min={props.min}
								max={state.custom.end ?? props.max}
								size={size}
								footer={props.footer}
							/>
						</Field>
						<Field onMouseDown={(event) => event.stopPropagation()}>
							<Label>End</Label>
							<DatePicker
								input
								clearable={false}
								value={state.custom.end ?? undefined}
								onValueChange={state.custom.onEndChange}
								readOnly={state.readOnly}
								onMonthChange={props.onMonthChange}
								min={state.custom.start ?? props.min}
								max={props.max}
								size={size}
								footer={props.footer}
							/>
						</Field>
					</div>
				)}
				{/* One footer for both modes. Its Clear shows on a committed span in
				    list mode and on a settled Start+End in custom mode (gated in the
				    state hook). It clears the whole selection either way. */}
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</DateInputResetContext>
	)
}
