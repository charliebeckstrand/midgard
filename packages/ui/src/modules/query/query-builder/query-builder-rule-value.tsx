'use client'

import { DatePicker } from '../../../components/date-picker'
import { Flex } from '../../../components/flex'
import { Input } from '../../../components/input'
import { ListboxOption } from '../../../components/listbox'
import { Select } from '../../../components/select'
import { cn } from '../../../core'
import type { QueryField } from './types'

/** Props for {@link QueryBuilderRuleValue}: the rule's `field` and its current value plus a change callback. */
export type QueryBuilderRuleValueProps = {
	field: QueryField
	value: unknown
	onValueChange: (value: unknown) => void
	/** When true, edit a two-bound `[min, max]` tuple (the operator is a range). */
	range?: boolean
	className?: string
}

/** Parses an `<input>` string back to a numeric bound, keeping blanks blank (open-ended). @internal */
function toBound(next: string): number | '' {
	return next === '' ? '' : Number(next)
}

/** A range value as a `[min, max]` pair of numeric-or-blank bounds; non-tuples read as both-blank. @internal */
function toTuple(value: unknown): [number | '', number | ''] {
	const lo = Array.isArray(value) ? value[0] : ''
	const hi = Array.isArray(value) ? value[1] : ''

	return [lo == null ? '' : (lo as number | ''), hi == null ? '' : (hi as number | '')]
}

// Serializes/parses the date by its local wall-clock components. Round-tripping
// through `toISOString().slice(0, 10)` / `new Date('YYYY-MM-DD')` interprets the
// value as UTC midnight and drifts the day by ±1 in non-UTC timezones.
function toIsoDate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

function fromIsoDate(value: string): Date | undefined {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

	if (!match) return undefined

	const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))

	// Years 0–99 would otherwise resolve to 19xx.
	date.setFullYear(Number(match[1]))

	return date
}

/**
 * Value input for a query rule, chosen by the field's type: a {@link Select}
 * for `select`, a numeric {@link Input} for `number`, a {@link DatePicker}
 * (round-tripped as a local-wall-clock ISO date) for `date`, and a text
 * {@link Input} otherwise.
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
				<Input
					type="number"
					value={lo === '' ? '' : String(lo)}
					placeholder="Min"
					aria-label={`${field.label} minimum`}
					className="w-full"
					onChange={(event) => onValueChange([toBound(event.target.value), hi])}
				/>

				<Input
					type="number"
					value={hi === '' ? '' : String(hi)}
					placeholder="Max"
					aria-label={`${field.label} maximum`}
					className="w-full"
					onChange={(event) => onValueChange([lo, toBound(event.target.value)])}
				/>
			</Flex>
		)
	}

	if (field.type === 'select') {
		return (
			<Select
				value={(value as string | undefined) ?? ''}
				displayValue={(v: string) => field.options?.find((o) => o.value === v)?.label ?? ''}
				onValueChange={(v: string | undefined) => onValueChange(v ?? '')}
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
			<Input
				type="number"
				value={value == null ? '' : String(value)}
				placeholder="Value"
				aria-label={label}
				className={className}
				onChange={(event) => {
					const next = event.target.value
					onValueChange(next === '' ? '' : Number(next))
				}}
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
