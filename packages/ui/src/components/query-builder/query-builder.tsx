'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/query-builder'
import { Fieldset } from '../fieldset'
import type { QueryBuilderStateValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryBuilderGroup } from './query-builder-group'
import type { QueryField, QueryGroup as QueryGroupNode } from './types'
import { useQueryBuilderTree } from './use-query-builder-tree'

export type QueryBuilderProps = {
	fields: QueryField[]
	value?: QueryGroupNode
	defaultValue?: QueryGroupNode
	onValueChange?: (value: QueryGroupNode) => void
	disabled?: boolean
	className?: string
}

/** Nested group / rule editor for boolean queries; produces a tree of `and` / `or` groups over typed field rules. */
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
