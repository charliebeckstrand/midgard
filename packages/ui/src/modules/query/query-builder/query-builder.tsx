'use client'

import { useCallback, useMemo } from 'react'
import { Fieldset } from '../../../components/fieldset'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/query-builder'
import type { QueryBuilderStateValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryBuilderGroup } from './query-builder-group'
import type { QueryField, QueryGroup as QueryGroupNode } from './types'
import { useQueryBuilderTree } from './use-query-builder-tree'

/** Props for {@link QueryBuilder}: the queryable `fields` and the controlled/uncontrolled query tree. */
export type QueryBuilderProps = {
	/** Fields available to rules, each with a type and operator set. */
	fields: QueryField[]
	value?: QueryGroupNode
	defaultValue?: QueryGroupNode
	onValueChange?: (value: QueryGroupNode) => void
	/** Disables every control in the tree. @defaultValue false */
	disabled?: boolean
	/**
	 * Allow nested groups via an "Add group" action. Set `false` for a flat list
	 * of rules joined by AND/OR.
	 * @defaultValue true
	 */
	allowGroups?: boolean
	/**
	 * Hide each rule's field selector — for a single fixed field, e.g. a
	 * column-scoped filter. Supply that one field in `fields`.
	 * @defaultValue false
	 */
	hideFieldSelector?: boolean
	/**
	 * Keep at least one rule in the query: a group's sole remaining rule hides its
	 * remove control, so the builder can't be emptied. For always-on filters (a
	 * column filter) that must keep a rule to edit.
	 * @defaultValue false
	 */
	requireRule?: boolean
	className?: string
}

/**
 * Nested group/rule editor for boolean queries. Produces a tree of `and`/`or`
 * groups over typed field rules, controlled or uncontrolled through
 * `value`/`onValueChange`, and supplies field config and tree-edit actions to
 * its descendants via context.
 */
export function QueryBuilder({
	fields,
	value,
	defaultValue,
	onValueChange,
	disabled = false,
	allowGroups = true,
	hideFieldSelector = false,
	requireRule = false,
	className,
}: QueryBuilderProps) {
	const { root, actions, register } = useQueryBuilderTree({
		fields,
		value,
		defaultValue,
		onValueChange,
	})

	const getField = useCallback((name: string) => fields.find((f) => f.name === name), [fields])

	const state = useMemo<QueryBuilderStateValue>(
		() => ({ fields, getField, disabled, allowGroups, hideFieldSelector, requireRule }),
		[fields, getField, disabled, allowGroups, hideFieldSelector, requireRule],
	)

	return (
		<QueryBuilderProvider state={state} actions={actions} root={root} register={register}>
			<Fieldset data-slot="query-builder" disabled={disabled} className={cn(k.base, className)}>
				<QueryBuilderGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
