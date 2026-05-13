'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/query-builder'
import { Fieldset } from '../fieldset'
import type { QueryBuilderStateValue } from './context'
import { QueryBuilderProvider } from './context'
import { QueryGroup } from './group'
import type { QueryField, QueryGroup as QueryGroupNode } from './types'
import { useQueryBuilderTree } from './use-query-builder-tree'

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
	const { root, actions } = useQueryBuilderTree({ fields, value, defaultValue, onChange })

	const getField = useCallback((name: string) => fields.find((f) => f.name === name), [fields])

	const state = useMemo<QueryBuilderStateValue>(
		() => ({ fields, getField, disabled }),
		[fields, getField, disabled],
	)

	return (
		<QueryBuilderProvider state={state} actions={actions} root={root}>
			<Fieldset data-slot="query-builder" disabled={disabled} className={cn(k.base, className)}>
				<QueryGroup group={root} root />
			</Fieldset>
		</QueryBuilderProvider>
	)
}
