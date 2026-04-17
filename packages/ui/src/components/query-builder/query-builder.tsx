'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { Fieldset } from '../fieldset'
import type { QueryBuilderContextValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryGroup } from './group'
import type { QueryGroup as QueryGroupNode, QueryRule as QueryRuleNode } from './types'
import { addChild, createGroup, createRule, mapNode, removeChild } from './utilities'
import { k } from './variants'

// ── QueryBuilder ───────────────────────────────────────

export type QueryBuilderProps = {
	fields: QueryBuilderContextValue['fields']
	value?: QueryGroupNode
	defaultValue?: QueryGroupNode
	onChange?: (value: QueryGroupNode) => void
	disabled?: boolean
	className?: string
}

export function QueryBuilder({
	fields,
	value,
	defaultValue,
	onChange,
	disabled = false,
	className,
}: QueryBuilderProps) {
	const initial = useMemo(() => defaultValue ?? createGroup('and'), [defaultValue])

	const [state, setState] = useControllable<QueryGroupNode>({
		value,
		defaultValue: initial,
		onChange: onChange as ((v: QueryGroupNode | undefined) => void) | undefined,
	})

	const root = state ?? initial

	const getField = useCallback((name: string) => fields.find((f) => f.name === name), [fields])

	const updateRule = useCallback<QueryBuilderContextValue['updateRule']>(
		(id, patch) => {
			setState((prev) =>
				mapNode(prev ?? initial, id, (node) =>
					node.type === 'rule' ? ({ ...node, ...patch } as QueryRuleNode) : node,
				),
			)
		},
		[setState, initial],
	)

	const updateCombinator = useCallback<QueryBuilderContextValue['updateCombinator']>(
		(id, combinator) => {
			setState((prev) =>
				mapNode(prev ?? initial, id, (node) =>
					node.type === 'group' ? { ...node, combinator } : node,
				),
			)
		},
		[setState, initial],
	)

	const addRule = useCallback(
		(groupId: string) => {
			setState((prev) => addChild(prev ?? initial, groupId, createRule(fields[0])))
		},
		[setState, initial, fields],
	)

	const addGroup = useCallback(
		(groupId: string) => {
			setState((prev) =>
				addChild(prev ?? initial, groupId, createGroup('and', [createRule(fields[0])])),
			)
		},
		[setState, initial, fields],
	)

	const remove = useCallback(
		(id: string) => {
			setState((prev) => removeChild(prev ?? initial, id))
		},
		[setState, initial],
	)

	const ctx = useMemo<QueryBuilderContextValue>(
		() => ({
			fields,
			getField,
			disabled,
			updateRule,
			updateCombinator,
			addRule,
			addGroup,
			remove,
			root,
		}),
		[fields, getField, disabled, updateRule, updateCombinator, addRule, addGroup, remove, root],
	)

	return (
		<QueryBuilderProvider value={ctx}>
			<Fieldset data-slot="query-builder" disabled={disabled} className={cn(k.base, className)}>
				<QueryGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
