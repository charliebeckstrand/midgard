'use client'

import { DatePicker } from '../date-picker'
import { Input } from '../input'
import { ListboxOption } from '../listbox'
import { Select } from '../select'
import type { QueryField } from './types'

export type QueryBuilderRuleValueProps = {
	field: QueryField
	value: unknown
	onValueChange: (value: unknown) => void
	className?: string
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

	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function QueryBuilderRuleValue({
	field,
	value,
	onValueChange,
	className,
}: QueryBuilderRuleValueProps) {
	const label = `${field.label} value`

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
				onChange={(e) => {
					const next = e.target.value
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
			onChange={(e) => onValueChange(e.target.value)}
		/>
	)
}
