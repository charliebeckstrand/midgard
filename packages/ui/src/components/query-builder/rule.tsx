'use client'

import { Trash } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { Button } from '../button'
import { Flex } from '../flex'
import { Icon } from '../icon'
import { ListboxOption } from '../listbox'
import { Select } from '../select'
import { useQueryBuilderActions, useQueryBuilderState } from './context'
import { QueryRuleValue } from './rule-value'
import type { QueryRule as QueryRuleNode } from './types'
import { getOperators } from './utilities'
import { k } from './variants'

// ── QueryRule ──────────────────────────────────────────

export type QueryRuleProps = {
	rule: QueryRuleNode
	className?: string
}

function QueryRuleImpl({ rule, className }: QueryRuleProps) {
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
					<QueryRuleValue
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
				prefix={<Icon icon={<Trash />} />}
				onClick={onRemove}
			/>
		</Flex>
	)
}

export const QueryRule = memo(QueryRuleImpl)
