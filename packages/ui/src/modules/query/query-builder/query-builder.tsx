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
		() => ({ fields, getField, disabled }),
		[fields, getField, disabled],
	)

	return (
		<QueryBuilderProvider state={state} actions={actions} root={root} register={register}>
			<Fieldset data-slot="query-builder" disabled={disabled} className={cn(k.base, className)}>
				<QueryBuilderGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
