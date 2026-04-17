'use client'

import { createContext } from '../../core/create-context'
import type { QueryCombinator, QueryField, QueryGroup, QueryRule } from './types'

export type QueryBuilderContextValue = {
	fields: QueryField[]
	getField: (name: string) => QueryField | undefined
	disabled: boolean
	updateRule: (id: string, patch: Partial<QueryRule>) => void
	updateCombinator: (id: string, combinator: QueryCombinator) => void
	addRule: (groupId: string) => void
	addGroup: (groupId: string) => void
	remove: (id: string) => void
	root: QueryGroup
}

export const [QueryBuilderProvider, useQueryBuilderContext] =
	createContext<QueryBuilderContextValue>('QueryBuilder')
