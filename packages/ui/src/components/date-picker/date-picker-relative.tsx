'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../core'
import { k } from '../../recipes/kata/date-picker'
import { Badge } from '../badge'
import { Button } from '../button'
import { CalendarRange } from '../calendar'
import { Icon } from '../icon'
import type { DatePickerBaseProps, DatePickerRelativeProps } from './date-picker'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerRelativeState } from './use-date-picker-relative-state'

// Trigger chips read one size step below the trigger, per Badge's affix guidance.
const chipSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

/**
 * Relative variant of {@link DatePicker}: a multi-select list of relative-range
 * presets plus a mutually-exclusive "Custom range" row that swaps the popover to
 * a `CalendarRange`. The live selection shows as chips in the trigger and
 * commits an array of `{ from, to }` spans. Rendered by `DatePicker` when
 * `relative` is set.
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
				label={state.mode === 'calendar' ? 'Select dates' : 'Select range'}
			>
				{state.mode === 'list' ? (
					<div className={cn(k.relative.root)}>
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
							onClick={state.enterCalendar}
						>
							Custom range
							<Icon icon={<ChevronRight />} />
						</Button>
					</div>
				) : (
					<div className={cn(k.relative.calendar)}>
						<Button
							type="button"
							variant="bare"
							className={cn(k.relative.back)}
							onClick={state.backToList}
						>
							<Icon icon={<ArrowLeft />} />
							Back to presets
						</Button>
						<CalendarRange
							ref={state.calendar.calendarRef}
							onValueChange={state.calendar.onValueChange}
							min={props.min}
							max={props.max}
							rangeStart={state.calendar.rangeStart}
							rangeEnd={state.calendar.rangeEnd}
							hoverDate={state.calendar.hoverDate}
							onHoverDate={state.calendar.onHoverDate}
							active={state.calendar.active}
							footerRef={state.calendar.footerRef}
						/>
					</div>
				)}
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</>
	)
}
