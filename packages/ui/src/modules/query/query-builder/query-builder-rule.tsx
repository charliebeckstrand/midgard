'use client'

import { Trash } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import type { JsonValue } from '../../../components/json-tree'
import { ListboxOption } from '../../../components/listbox'
import { Select } from '../../../components/select'
import { cn } from '../../../core'
import { useIntl } from '../../../primitives/intl/use-intl'
import { k } from '../../../recipes/kata/query-builder'
import { Flex } from '../../../structure/flex'
import { mapResponsive, type Orientation } from '../../../types'
import { describeNode } from '../engine/query-announcements'
import { createRule } from '../engine/query-node'
import { getOperators, operatorLabel, operatorValueLabel } from '../engine/query-operators'
import type { QueryRule } from '../engine/types'
import { useFocusableRef, useQueryBuilderActions, useQueryBuilderState } from './context'
import { focusKeys } from './query-builder-focus'
import { queryBuilderMessages } from './query-builder-messages'
import { QueryBuilderRuleValue } from './query-builder-rule-value'

/** The flex direction of the parts of a rule in each orientation. @internal */
function toDirection(orientation: Orientation) {
	return orientation === 'vertical' ? 'col' : 'row'
}

/** Props for {@link QueryBuilderRule}: the rule node to render. @internal */
export type QueryBuilderRuleProps = {
	/** The rule node to render. */
	rule: QueryRule
	/**
	 * Whether this rule shows its remove control. The enclosing group passes
	 * `false` for the sole remaining rule under `requireRule`, so the query keeps
	 * at least one rule. @defaultValue true
	 */
	removable?: boolean
	className?: string
}

/**
 * Renders one query rule: field and operator {@link Select}s plus a type-aware
 * value input, and, when `removable`, a remove button. For a `noValue` operator
 * the value input is replaced by its fixed `valueLabel` as static text
 * ("is" · "Empty"). It is replaced by nothing when the operator names none.
 * Changing the field resets the operator and the value to those of a new rule
 * of that field. The rule is a `role="group"` named by its summary, so its
 * controls read as part of one rule. Memoized.
 */
function QueryBuilderRuleImpl({ rule, removable = true, className }: QueryBuilderRuleProps) {
	const { fields, getField, disabled, hideFieldSelector, orientation } = useQueryBuilderState()

	const { updateRule, remove } = useQueryBuilderActions()

	const intl = useIntl()

	const field = getField(rule.field)

	const operators = useMemo(() => (field ? getOperators(field) : []), [field])

	const selectedOperator = operators.find((option) => option.value === rule.operator)

	const onFieldChange = useCallback(
		(nextFieldName: string | null) => {
			if (!nextFieldName) return

			const { operator, value } = createRule(getField(nextFieldName))

			updateRule(rule.id, { field: nextFieldName, operator, value })
		},
		[getField, rule.id, updateRule],
	)

	const onOperatorChange = useCallback(
		(operator: string | null) => {
			if (!operator) return

			// Switching between a scalar and a range operator changes the value's
			// shape, so reset to the matching empty value; staying on the same arity
			// keeps the current value.
			const nextRange = operators.find((option) => option.value === operator)?.range ?? false

			const patch =
				nextRange !== (selectedOperator?.range ?? false)
					? { operator, value: nextRange ? ['', ''] : '' }
					: { operator }

			updateRule(rule.id, patch)
		},
		[rule.id, updateRule, operators, selectedOperator],
	)

	const onValueChange = useCallback(
		(value: JsonValue) => updateRule(rule.id, { value }),
		[rule.id, updateRule],
	)

	const onRemove = useCallback(() => remove(rule.id), [remove, rule.id])

	const slots = k({ orientation })

	const removeRef = useFocusableRef(focusKeys.node(rule.id))

	const displayField = useCallback(
		(fieldName: string) => getField(fieldName)?.label ?? '',
		[getField],
	)

	const displayOperator = useCallback(
		(operator: string) => {
			const option = operators.find((candidate) => candidate.value === operator)

			return option ? operatorLabel(intl, option) : ''
		},
		[operators, intl],
	)

	const subject = selectedOperator?.noValue && operatorValueLabel(intl, selectedOperator)

	const fieldLabel = intl.formatMessage(queryBuilderMessages.field)

	const operatorName = intl.formatMessage(queryBuilderMessages.operator)

	return (
		// Each rule has a "Field" and an "Operator" select. The group name tells
		// one rule from the next ("Status is Active", or "Status rule" while blank).
		<Flex
			data-slot="query-rule"
			role="group"
			aria-label={describeNode(intl, rule, fields)}
			gap="sm"
			full
			className={cn(slots.rule, className)}
		>
			<Flex
				flex="1"
				gap="sm"
				direction={mapResponsive(orientation, toDirection)}
				className={slots.parts}
			>
				{!hideFieldSelector && (
					<Select
						value={rule.field}
						displayValue={displayField}
						onValueChange={onFieldChange}
						placeholder={fieldLabel}
						aria-label={fieldLabel}
						className={slots.part}
					>
						{fields.map((entry) => (
							<ListboxOption key={entry.name} value={entry.name}>
								{entry.label}
							</ListboxOption>
						))}
					</Select>
				)}

				<Select
					value={rule.operator}
					displayValue={displayOperator}
					onValueChange={onOperatorChange}
					placeholder={operatorName}
					aria-label={operatorName}
					className={slots.part}
				>
					{operators.map((operator) => (
						<ListboxOption key={operator.value} value={operator.value}>
							{operatorLabel(intl, operator)}
						</ListboxOption>
					))}
				</Select>

				{/* A box holds the value editor as the row's part. An input with
				    affixes puts its `className` on the inner `<input>`, not on the
				    frame that the row sizes. */}
				{field && !selectedOperator?.noValue && (
					<div className={selectedOperator?.range ? slots.range : slots.part}>
						<QueryBuilderRuleValue
							field={field}
							value={rule.value}
							onValueChange={onValueChange}
							range={selectedOperator?.range}
							className="w-full"
						/>
					</div>
				)}

				{/* A value-less operator naming a fixed subject ("is" · "Empty") shows it
				    as static text in the value column. The rule then still reads as a
				    sentence. There is nothing to edit, hence no control. */}
				{subject && (
					<Flex align="center" full className={cn(slots.value, slots.part)}>
						{subject}
					</Flex>
				)}
			</Flex>

			{removable && (
				<Button
					type="button"
					ref={removeRef}
					variant="bare"
					color="red"
					aria-label={intl.formatMessage(queryBuilderMessages.removeRule)}
					disabled={disabled}
					className={slots.remove}
					onClick={onRemove}
				>
					<Icon icon={<Trash />} />
				</Button>
			)}
		</Flex>
	)
}

/**
 * Renders one query rule within a {@link QueryBuilderGroup}: field and operator
 * {@link Select}s plus a type-aware value input and a remove button. A
 * `noValue` operator shows its fixed `valueLabel` as static text instead.
 *
 * @internal
 */
export const QueryBuilderRule = memo(QueryBuilderRuleImpl)
