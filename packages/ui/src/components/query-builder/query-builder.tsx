'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { Fieldset } from '../fieldset'
import type { QueryBuilderActions, QueryBuilderStateValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryGroup } from './group'
import type { QueryField, QueryGroup as QueryGroupNode, QueryRule as QueryRuleNode } from './types'
import { addChild, createGroup, createRule, mapNode, removeChild } from './utilities'
import { k } from './variants'

// ── QueryBuilder ───────────────────────────────────────

export type QueryBuilderProps = {
	fields: QueryField[]
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

	const [tree, setTree] = useControllable<QueryGroupNode>({
		value,
		defaultValue: initial,
		onChange: onChange as ((v: QueryGroupNode | undefined) => void) | undefined,
	})

	const root = tree ?? initial

	const getField = useCallback((name: string) => fields.find((f) => f.name === name), [fields])

	const updateRule = useCallback<QueryBuilderActions['updateRule']>(
		(id, patch) => {
			setTree((prev) =>
				mapNode(prev ?? initial, id, (node) =>
					node.type === 'rule' ? ({ ...node, ...patch } as QueryRuleNode) : node,
				),
			)
		},
		[setTree, initial],
	)

	const updateCombinator = useCallback<QueryBuilderActions['updateCombinator']>(
		(id, combinator) => {
			setTree((prev) => mapNode(prev ?? initial, id, (node) => ({ ...node, combinator })))
		},
		[setTree, initial],
	)

	const addRule = useCallback(
		(groupId: string) => {
			setTree((prev) => addChild(prev ?? initial, groupId, createRule(fields[0])))
		},
		[setTree, initial, fields],
	)

	const addGroup = useCallback(
		(groupId: string) => {
			setTree((prev) =>
				addChild(prev ?? initial, groupId, createGroup('and', [createRule(fields[0])])),
			)
		},
		[setTree, initial, fields],
	)

	const remove = useCallback(
		(id: string) => {
			setTree((prev) => removeChild(prev ?? initial, id))
		},
		[setTree, initial],
	)

	const state = useMemo<QueryBuilderStateValue>(
		() => ({ fields, getField, disabled }),
		[fields, getField, disabled],
	)

	const actions = useMemo<QueryBuilderActions>(
		() => ({ updateRule, updateCombinator, addRule, addGroup, remove }),
		[updateRule, updateCombinator, addRule, addGroup, remove],
	)

	return (
		<QueryBuilderProvider state={state} actions={actions} root={root}>
			<Fieldset data-slot="query-builder" disabled={disabled} className={cn(k.base, className)}>
				<QueryGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
