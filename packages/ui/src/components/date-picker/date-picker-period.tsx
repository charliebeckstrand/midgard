'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/date-picker'
import { Badge } from '../badge'
import { Button } from '../button'
import type { DatePickerBaseProps, DatePickerPeriodProps } from './date-picker'
import { DatePickerContent } from './date-picker-content'
import { DatePickerFooter } from './date-picker-footer'
import { type PeriodFacet, QUARTERS, quarterLabel } from './date-picker-period-utilities'
import { DatePickerTrigger } from './date-picker-trigger'
import { useDatePickerPeriodState } from './use-date-picker-period-state'

// Trigger chips read one size step below the trigger, per Badge's affix guidance.
const chipSize = { sm: 'xs', md: 'sm', lg: 'md' } as const

type PeriodState = ReturnType<typeof useDatePickerPeriodState>

/**
 * Period variant of {@link DatePicker}: three independent multi-select toggle
 * groups (year / quarter / month) in the popover, with the live selection shown
 * as chips in the trigger and a footer Clear. Rendered by `DatePicker` when
 * `period` is set.
 *
 * @internal
 */
export function DatePickerPeriod(props: DatePickerBaseProps & DatePickerPeriodProps) {
	const {
		placeholder = 'Select period',
		size = 'md',
		truncate = true,
		className,
		'aria-label': ariaLabel,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const state = useDatePickerPeriodState(props)

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
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			>
				{state.chips.length === 0 ? (
					<span className={cn('min-w-0 flex-1', k.placeholder)}>{placeholder}</span>
				) : (
					<span className={cn(k.period.chips, truncate ? 'flex-1 overflow-hidden' : 'flex-wrap')}>
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
				label="Select period"
			>
				<div className={cn(k.period.root)}>
					<PeriodGroup
						state={state}
						facet="years"
						label="Year"
						options={state.years.map((year) => ({ value: year, label: String(year) }))}
					/>
					<PeriodGroup
						state={state}
						facet="quarters"
						label="Quarter"
						options={QUARTERS.map((quarter) => ({ value: quarter, label: quarterLabel(quarter) }))}
					/>
					<PeriodGroup
						state={state}
						facet="months"
						label="Month"
						options={state.monthLabels.map((label, index) => ({ value: index + 1, label }))}
					/>
				</div>
				<DatePickerFooter {...state.footer} />
			</DatePickerContent>
		</>
	)
}

/** One labeled facet of toggle buttons (a year / quarter / month group). @internal */
function PeriodGroup({
	state,
	facet,
	label,
	options,
}: {
	state: PeriodState
	facet: PeriodFacet
	label: string
	options: { value: number; label: string }[]
}) {
	const selectedSet = state.value?.[facet]

	// `<fieldset>`/`<legend>` group the toggles and name the group natively;
	// the defaults are reset so it lays out like the surrounding stack.
	return (
		<fieldset className={cn('m-0 min-w-0 border-0 p-0', k.period.section)}>
			<legend className={cn('p-0', k.period.label)}>{label}</legend>
			<div className={cn(k.period.options)}>
				{options.map((option) => {
					const selected = selectedSet?.includes(option.value) ?? false

					return (
						<Button
							key={option.value}
							type="button"
							size="sm"
							variant={selected ? 'solid' : 'soft'}
							color={selected ? 'blue' : 'zinc'}
							aria-pressed={selected}
							data-period-cell=""
							onClick={() => state.toggleFacet(facet, option.value)}
						>
							{option.label}
						</Button>
					)
				})}
			</div>
		</fieldset>
	)
}
