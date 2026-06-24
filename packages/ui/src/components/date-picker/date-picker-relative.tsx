'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/date-picker'
import { Badge } from '../badge'
import { Button } from '../button'
import { Field, Label } from '../fieldset'
import { Icon } from '../icon'
// Sibling variant reused for the custom range's Start/End fields; safe despite the
// import cycle since both are hoisted function declarations used only at render.
import { DatePicker, type DatePickerBaseProps, type DatePickerRelativeProps } from './date-picker'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerRelativeState } from './use-date-picker-relative-state'

// Trigger chips read one size step below the trigger, per Badge's affix guidance.
const chipSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

/**
 * Relative variant of {@link DatePicker}: a multi-select list of relative-range
 * presets plus a mutually-exclusive "Custom range" row that swaps the popover to
 * Start/End date fields (each an `input`-mode picker — type or pick from a
 * calendar). The live selection shows as chips in the trigger and commits an
 * array of `{ from, to }` spans. Rendered by `DatePicker` when `relative` is set.
 *
 * @internal
 */
export function DatePickerRelative(props: DatePickerBaseProps & DatePickerRelativeProps) {
	const {
		placeholder = 'Select range',
		size = 'md',
		truncate = true,
		clearable = true,
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerRelativeState(props)

	// Row count that splits the presets plus the trailing custom row into two
	// balanced, column-major columns (see the `relative.root` recipe): the leading
	// half fills the first column, the rest the second.
	const rows = Math.ceil((state.presets.length + 1) / 2)

	return (
		<>
			<DatePickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				placeholder={placeholder}
				size={size}
				truncate={truncate}
				aria-label={ariaLabel}
				disabled={state.disabled}
				required={state.required}
				invalid={state.invalid}
				onKeyDown={state.onTriggerKeyDown}
				clearable={clearable}
				hasValue={state.hasValue}
				onClear={state.onClear}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			>
				{state.chips.length === 0 ? (
					<span className={cn('min-w-0 flex-1', k.placeholder)}>{placeholder}</span>
				) : (
					<span className={cn(k.relative.chips, truncate ? 'flex-1 overflow-hidden' : 'flex-wrap')}>
						{state.chips.map((chip) => (
							<Badge key={chip.key} size={chipSize[size]}>
								{chip.label}
							</Badge>
						))}
					</span>
				)}
			</DatePickerTrigger>
			<DatePickerContent
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
						className={cn(k.relative.root)}
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
							className={cn(k.relative.custom)}
							onClick={state.enterCustom}
						>
							Custom range
							<Icon icon={<ChevronRight />} />
						</Button>
					</div>
				) : (
					<div className={cn(k.relative.customPanel)}>
						<Button
							type="button"
							variant="bare"
							className={cn(k.relative.back)}
							onClick={state.backToList}
						>
							<Icon icon={<ArrowLeft />} />
							Back to presets
						</Button>
						{/* Each field is a single-date picker in `input` mode: a typed
						    DateInput whose suffix button opens a calendar. The popover
						    preventDefaults mousedown to hold DOM focus on the dialog for
						    the calendar variants' virtual model, so stop mousedown here to
						    let a click focus the input. `clearable` is off so the suffix —
						    and thus the field width — stays fixed as a date is entered. */}
						<Field onMouseDown={(event) => event.stopPropagation()}>
							<Label>Start</Label>
							<DatePicker
								input
								clearable={false}
								value={state.custom.start ?? undefined}
								onValueChange={state.custom.onStartChange}
								min={props.min}
								max={state.custom.end ?? props.max}
								size={size}
							/>
						</Field>
						<Field onMouseDown={(event) => event.stopPropagation()}>
							<Label>End</Label>
							<DatePicker
								input
								clearable={false}
								value={state.custom.end ?? undefined}
								onValueChange={state.custom.onEndChange}
								min={state.custom.start ?? props.min}
								max={props.max}
								size={size}
							/>
						</Field>
					</div>
				)}
				{/* One footer for both modes: its Clear shows on a committed span in
				    list mode and on a settled Start+End in custom mode (gated in the
				    state hook), and clears the whole selection either way. */}
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</>
	)
}
