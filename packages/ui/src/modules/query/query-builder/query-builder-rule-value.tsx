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

/** A set bound as a number, or `undefined` for a blank bound or one that is not a number. @internal */
function toBound(value: number | ''): number | undefined {
	if (value === '') return undefined

	const bound = Number(value)

	return Number.isFinite(bound) ? bound : undefined
}

/**
 * The limits of each bound of a range. Each bound clamps to the field's `span`,
 * and each bound also clamps to the other, so the pair cannot invert. A bound
 * outside the span keeps each input's `min` at or below its `max`.
 *
 * @internal
 */
function rangeLimits(
	span: QueryField['span'],
	lo: number | undefined,
	hi: number | undefined,
): { lo: { min?: number; max?: number }; hi: { min?: number; max?: number } } {
	const [floor, ceiling] = span ?? []

	const loMax = hi === undefined ? ceiling : floor === undefined ? hi : Math.max(hi, floor)

	const hiMin = lo === undefined ? floor : ceiling === undefined ? lo : Math.min(lo, ceiling)

	return { lo: { min: floor, max: loMax }, hi: { min: hiMin, max: ceiling } }
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
 * The `[min, max]` pair of number inputs for a range rule. Each bound clamps
 * to the field's `span` and to the other bound. With a span, each placeholder
 * is its end of the span alone (`18`), because each input's steppers leave
 * room for a few characters only. With no span, the placeholders are `Min` and
 * `Max`.
 *
 * @internal
 */
function RangeValue({
	field,
	value,
	onValueChange,
	className,
}: Omit<QueryBuilderRuleValueProps, 'range'>) {
	const [lo, hi] = toTuple(value)

	const limits = rangeLimits(field.span, toBound(lo), toBound(hi))

	const [floor, ceiling] = field.span ?? []

	return (
		<Flex gap="sm" className={cn('w-full', className)}>
			<NumberInput
				value={lo === '' ? null : lo}
				placeholder={floor === undefined ? 'Min' : String(floor)}
				aria-label={`${field.label} minimum`}
				min={limits.lo.min}
				max={limits.lo.max}
				className="w-full"
				onValueChange={(next) => onValueChange([next ?? '', hi])}
			/>

			<NumberInput
				value={hi === '' ? null : hi}
				placeholder={ceiling === undefined ? 'Max' : String(ceiling)}
				aria-label={`${field.label} maximum`}
				min={limits.hi.min}
				max={limits.hi.max}
				className="w-full"
				onValueChange={(next) => onValueChange([lo, next ?? ''])}
			/>
		</Flex>
	)
}

/**
 * Value input for a query rule, chosen by the field's type:
 *
 * - `select`: a {@link Select}
 * - `number`: a {@link NumberInput}, or a `[min, max]` pair of them when the
 *   operator is a range. The pair clamps to the field's `span` and to each other
 * - `date`: a {@link DatePicker}, round-tripped as a local-wall-clock ISO date
 * - anything else: a text {@link Input}
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
		return (
			<RangeValue field={field} value={value} onValueChange={onValueChange} className={className} />
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
