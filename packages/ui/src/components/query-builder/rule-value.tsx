'use client'

import { DatePicker } from '../datepicker'
import { Input } from '../input'
import { ListboxOption } from '../listbox'
import { Select } from '../select'
import type { QueryField } from './types'

// ── QueryRuleValue ─────────────────────────────────────

export type QueryRuleValueProps = {
	field: QueryField
	value: unknown
	onChange: (value: unknown) => void
}

export function QueryRuleValue({ field, value, onChange }: QueryRuleValueProps) {
	if (field.type === 'select') {
		return (
			<Select
				value={(value as string | undefined) ?? ''}
				onChange={(v: string | undefined) => onChange(v ?? '')}
				placeholder="Value"
				displayValue={(v: string) => field.options?.find((o) => o.value === v)?.label ?? ''}
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
				onChange={(e) => {
					const next = e.target.value
					onChange(next === '' ? '' : Number(next))
				}}
			/>
		)
	}

	if (field.type === 'date') {
		const dateValue = value ? new Date(value as string) : undefined

		return (
			<DatePicker
				value={dateValue}
				placeholder="Value"
				onChange={(d) => onChange(d ? d.toISOString().slice(0, 10) : '')}
			/>
		)
	}

	return (
		<Input
			type="text"
			value={(value as string | undefined) ?? ''}
			placeholder="Value"
			onChange={(e) => onChange(e.target.value)}
		/>
	)
}
