'use client'

import { Trash } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { Icon } from '../../../components/icon'
import { ListboxOption } from '../../../components/listbox'
import { Select } from '../../../components/select'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/query-builder'
import { useFocusableRef, useQueryBuilderActions, useQueryBuilderState } from './context'
import { QueryBuilderRuleValue } from './query-builder-rule-value'
import { focusKeys, getOperators } from './query-builder-utilities'
import type { QueryRule } from './types'

/** Props for {@link QueryBuilderRule}: the rule node to render. */
export type QueryBuilderRuleProps = {
	rule: QueryRule
	className?: string
}

/**
 * Renders one query rule: field and operator {@link Select}s plus a type-aware
 * value input (suppressed for `noValue` operators) and a remove button.
 * Changing the field resets the operator and value. Memoized.
 */
function QueryBuilderRuleImpl({ rule, className }: QueryBuilderRuleProps) {
	const { fields, getField, disabled, hideFieldSelector } = useQueryBuilderState()

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
			if (!v) return

			// Switching between a scalar and a range operator changes the value's
			// shape, so reset to the matching empty value; staying on the same arity
			// keeps the current value.
			const nextRange = operators.find((o) => o.value === v)?.range ?? false

			const patch =
				nextRange !== (selectedOperator?.range ?? false)
					? { operator: v, value: nextRange ? ['', ''] : '' }
					: { operator: v }

			updateRule(rule.id, patch)
		},
		[rule.id, updateRule, operators, selectedOperator],
	)

	const onValueChange = useCallback(
		(v: unknown) => updateRule(rule.id, { value: v }),
		[rule.id, updateRule],
	)

	const onRemove = useCallback(() => remove(rule.id), [remove, rule.id])

	const removeRef = useFocusableRef(focusKeys.node(rule.id))

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
			<Flex flex="1" gap="sm" direction={{ initial: 'col', sm: 'row' }}>
				{!hideFieldSelector && (
					<Select
						value={rule.field}
						displayValue={displayField}
						onValueChange={onFieldChange}
						placeholder="Field"
						aria-label="Field"
						className="w-full"
					>
						{fields.map((f) => (
							<ListboxOption key={f.name} value={f.name}>
								{f.label}
							</ListboxOption>
						))}
					</Select>
				)}

				<Select
					value={rule.operator}
					displayValue={displayOperator}
					onValueChange={onOperatorChange}
					placeholder="Operator"
					aria-label="Operator"
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
						onValueChange={onValueChange}
						range={selectedOperator?.range}
						className="w-full"
					/>
				)}
			</Flex>

			<Button
				ref={removeRef}
				variant="bare"
				color="red"
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

/**
 * Renders one query rule within a {@link QueryBuilderGroup}: field and operator
 * {@link Select}s plus a type-aware value input (suppressed for `noValue`
 * operators) and a remove button.
 */
export const QueryBuilderRule = memo(QueryBuilderRuleImpl)
