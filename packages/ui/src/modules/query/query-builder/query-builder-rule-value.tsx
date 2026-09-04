'use client'

import { parseDate } from '@internationalized/date'
import { fromCalendarDate, toCalendarDate } from '../../../components/calendar/calendar-utilities'
import { DatePicker } from '../../../components/date-picker'
import { Flex } from '../../../components/flex'
import { Input } from '../../../components/input'
import { ListboxOption } from '../../../components/listbox'
import { NumberInput } from '../../../components/number-input'
import { Select } from '../../../components/select'
import { cn } from '../../../core'
import type { QueryField } from '../engine/types'

/** Props for {@link QueryBuilderRuleValue}: the rule's `field` and its current value plus a change callback. */
export type QueryBuilderRuleValueProps = {
	field: QueryField
	value: unknown
	onValueChange: (value: unknown) => void
	/** When true, edit a two-bound `[min, max]` tuple (the operator is a range). */
	range?: boolean
	className?: string
}

/** A range value as a `[min, max]` pair of numeric-or-blank bounds; non-tuples read as both-blank. @internal */
function toTuple(value: unknown): [number | '', number | ''] {
	const [lo, hi] = Array.isArray(value) ? value : []

	return [lo ?? '', hi ?? '']
}

// Serializes/parses the date by its local wall-clock components, through the
// calendar's timezone-free `CalendarDate`. Round-tripping through
// `toISOString().slice(0, 10)` / `new Date('YYYY-MM-DD')` would read the value
// as UTC midnight and drift the day by ±1 in non-UTC timezones.
function toIsoDate(date: Date): string {
	return toCalendarDate(date).toString()
}

/** The local-midnight `Date` for a `YYYY-MM-DD` string, or `undefined` where it does not parse. */
function fromIsoDate(value: string): Date | undefined {
	try {
		return fromCalendarDate(parseDate(value))
	} catch {
		return undefined
	}
}

/**
 * Value input for a query rule, chosen by the field's type: a {@link Select}
 * for `select`, a {@link NumberInput} for `number` (a `[min, max]` pair of them
 * when the operator is a range), a {@link DatePicker} (round-tripped as a
 * local-wall-clock ISO date) for `date`, and a text {@link Input} otherwise.
 */
export function QueryBuilderRuleValue({
	field,
	value,
	onValueChange,
	range,
	className,
}: QueryBuilderRuleValueProps) {
	const label = `${field.label} value`

	if (range) {
		const [lo, hi] = toTuple(value)

		return (
			<Flex gap="sm" className={cn('w-full', className)}>
				<NumberInput
					value={lo === '' ? null : lo}
					placeholder="Min"
					aria-label={`${field.label} minimum`}
					className="w-full"
					onValueChange={(next) => onValueChange([next ?? '', hi])}
				/>

				<NumberInput
					value={hi === '' ? null : hi}
					placeholder="Max"
					aria-label={`${field.label} maximum`}
					className="w-full"
					onValueChange={(next) => onValueChange([lo, next ?? ''])}
				/>
			</Flex>
		)
	}

	if (field.type === 'select') {
		return (
			<Select
				value={(value as string | undefined) ?? ''}
				displayValue={(v: string) => field.options?.find((o) => o.value === v)?.label ?? ''}
				onValueChange={(v: string | null) => onValueChange(v ?? '')}
				placeholder="Value"
				aria-label={label}
				className={className}
			>
				{field.options?.map((o) => (
					<ListboxOption key={o.value} value={o.value}>
						{o.label}
					</ListboxOption>
				))}
			</Select>
		)
	}

	if (field.type === 'number') {
		return (
			<NumberInput
				value={value === '' || value == null ? null : Number(value)}
				placeholder="Value"
				aria-label={label}
				className={className}
				onValueChange={(next) => onValueChange(next ?? '')}
			/>
		)
	}

	if (field.type === 'date') {
		const dateValue = value ? fromIsoDate(value as string) : undefined

		return (
			<DatePicker
				value={dateValue}
				placeholder="Value"
				aria-label={label}
				className={className}
				onValueChange={(d) => onValueChange(d ? toIsoDate(d) : '')}
			/>
		)
	}

	return (
		<Input
			type="text"
			value={(value as string | undefined) ?? ''}
			placeholder="Value"
			aria-label={label}
			className={className}
			onChange={(event) => onValueChange(event.target.value)}
		/>
	)
}
