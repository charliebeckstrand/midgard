'use client'

import { Trash } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/query-builder'
import { Button } from '../button'
import { DatePicker } from '../date-picker'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { Input } from '../input'
import { ListboxOption } from '../listbox'
import { Select } from '../select'
import { useQueryBuilderActions, useQueryBuilderState } from './context'
import { getOperators } from './query-builder-utilities'
import type { QueryField, QueryRule } from './types'

export type QueryBuilderRuleValueProps = {
	field: QueryField
	value: unknown
	onChange: (value: unknown) => void
	className?: string
}

export function QueryBuilderRuleValue({
	field,
	value,
	onChange,
	className,
}: QueryBuilderRuleValueProps) {
	if (field.type === 'select') {
		return (
			<Select
				value={(value as string | undefined) ?? ''}
				displayValue={(v: string) => field.options?.find((o) => o.value === v)?.label ?? ''}
				onChange={(v: string | undefined) => onChange(v ?? '')}
				placeholder="Value"
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

export type QueryBuilderRuleProps = {
	rule: QueryRule
	className?: string
}

function QueryBuilderRuleImpl({ rule, className }: QueryBuilderRuleProps) {
	const { fields, getField, disabled } = useQueryBuilderState()

	const { updateRule, remove } = useQueryBuilderActions()

	const field = getField(rule.field)

	const operators = useMemo(() => (field ? getOperators(field) : []), [field])

	const selectedOperator = operators.find((o) => o.value === rule.operator)

	const onFieldChange = useCallback(
		(nextFieldName: string | undefined) => {
			if (!nextFieldName) return

			const nextField = fields.find((f) => f.name === nextFieldName)

			const nextOps = nextField ? getOperators(nextField) : []

			updateRule(rule.id, {
				field: nextFieldName,
				operator: nextOps[0]?.value ?? '',
				value: '',
			})
		},
		[fields, rule.id, updateRule],
	)

	const onOperatorChange = useCallback(
		(v: string | undefined) => {
			if (v) updateRule(rule.id, { operator: v })
		},
		[rule.id, updateRule],
	)

	const onValueChange = useCallback(
		(v: unknown) => updateRule(rule.id, { value: v }),
		[rule.id, updateRule],
	)

	const onRemove = useCallback(() => remove(rule.id), [remove, rule.id])

	const displayField = useCallback(
		(v: string) => fields.find((f) => f.name === v)?.label ?? '',
		[fields],
	)

	const displayOperator = useCallback(
		(v: string) => operators.find((o) => o.value === v)?.label ?? '',
		[operators],
	)

	return (
		<Flex data-slot="query-rule" gap="sm" full className={cn(k.rule, className)}>
			<Flex equal flex gap="sm" direction={{ initial: 'row', sm: 'col' }}>
				<Select
					value={rule.field}
					displayValue={displayField}
					onChange={onFieldChange}
					placeholder="Field"
					className="w-full"
				>
					{fields.map((f) => (
						<ListboxOption key={f.name} value={f.name}>
							{f.label}
						</ListboxOption>
					))}
				</Select>

				<Select
					value={rule.operator}
					displayValue={displayOperator}
					onChange={onOperatorChange}
					placeholder="Operator"
					className="w-full"
				>
					{operators.map((op) => (
						<ListboxOption key={op.value} value={op.value}>
							{op.label}
						</ListboxOption>
					))}
				</Select>

				{field && !selectedOperator?.noValue && (
					<QueryBuilderRuleValue
						field={field}
						value={rule.value}
						onChange={onValueChange}
						className="w-full"
					/>
				)}
			</Flex>

			<Button
				variant="plain"
				aria-label="Remove rule"
				disabled={disabled}
				className={k.rowRemove}
				onClick={onRemove}
			>
				<Icon icon={<Trash />} />
			</Button>
		</Flex>
	)
}

export const QueryBuilderRule = memo(QueryBuilderRuleImpl)
