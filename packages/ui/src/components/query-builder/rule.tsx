'use client'

import { Trash } from 'lucide-react'
import { cn } from '../../core'
import { Button } from '../button'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { ListboxOption } from '../listbox'
import { Select } from '../select'
import { useQueryBuilderContext } from './context'
import { QueryRuleValue } from './rule-value'
import type { QueryRule as QueryRuleNode } from './types'
import { getOperators } from './utilities'
import { k } from './variants'

// ── QueryRule ──────────────────────────────────────────

export type QueryRuleProps = {
	rule: QueryRuleNode
	className?: string
}

export function QueryRule({ rule, className }: QueryRuleProps) {
	const { fields, getField, updateRule, remove, disabled } = useQueryBuilderContext()

	const field = getField(rule.field)

	const operators = field ? getOperators(field) : []

	const selectedOperator = operators.find((o) => o.value === rule.operator)

	const onFieldChange = (nextFieldName: string | undefined) => {
		if (!nextFieldName) return

		const nextField = fields.find((f) => f.name === nextFieldName)

		const nextOps = nextField ? getOperators(nextField) : []

		updateRule(rule.id, {
			field: nextFieldName,
			operator: nextOps[0]?.value ?? '',
			value: '',
		})
	}

	return (
		<Flex data-slot="query-rule" gap={2} className={cn(k.rule, className)}>
			<Flex equal flex gap={2}>
				<Select
					value={rule.field}
					onChange={onFieldChange}
					placeholder="Field"
					displayValue={(v: string) => fields.find((f) => f.name === v)?.label ?? ''}
				>
					{fields.map((f) => (
						<ListboxOption key={f.name} value={f.name}>
							{f.label}
						</ListboxOption>
					))}
				</Select>

				<Select
					value={rule.operator}
					onChange={(v: string | undefined) => v && updateRule(rule.id, { operator: v })}
					placeholder="Operator"
					displayValue={(v: string) => operators.find((o) => o.value === v)?.label ?? ''}
				>
					{operators.map((op) => (
						<ListboxOption key={op.value} value={op.value}>
							{op.label}
						</ListboxOption>
					))}
				</Select>

				{field && !selectedOperator?.noValue && (
					<QueryRuleValue
						field={field}
						value={rule.value}
						onChange={(v) => updateRule(rule.id, { value: v })}
					/>
				)}
			</Flex>

			<Button
				variant="plain"
				aria-label="Remove rule"
				disabled={disabled}
				className={k.rowRemove}
				prefix={<Icon icon={<Trash />} />}
				onClick={() => remove(rule.id)}
			/>
		</Flex>
	)
}
