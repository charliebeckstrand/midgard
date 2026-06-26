import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { QueryBuilderActions } from '../../modules/query/query-builder/context'
import {
	QueryBuilderProvider,
	useQueryBuilderActions,
	useQueryBuilderContext,
	useQueryBuilderState,
} from '../../modules/query/query-builder/context'
import { createGroup } from '../../modules/query/query-builder/query-builder-utilities'
import type { QueryField } from '../../modules/query/query-builder/types'

const fields: QueryField[] = [{ name: 'title', label: 'Title', type: 'text' }]

const stateValue = {
	fields,
	getField: (name: string) => fields.find((f) => f.name === name),
	disabled: false,
}

const actionsValue: QueryBuilderActions = {
	updateRule: () => {},
	updateCombinator: () => {},
	addRule: () => {},
	addGroup: () => {},
	remove: () => {},
}

function wrapper({ children }: { children: React.ReactNode }) {
	const root = createGroup()

	return (
		<QueryBuilderProvider state={stateValue} actions={actionsValue} root={root} register={() => {}}>
			{children}
		</QueryBuilderProvider>
	)
}

describe('QueryBuilderProvider', () => {
	it('exposes state to useQueryBuilderState', () => {
		const { result } = renderHook(() => useQueryBuilderState(), { wrapper })

		expect(result.current.fields).toBe(fields)

		expect(result.current.disabled).toBe(false)

		expect(result.current.getField('title')?.label).toBe('Title')
	})

	it('exposes actions to useQueryBuilderActions', () => {
		const { result } = renderHook(() => useQueryBuilderActions(), { wrapper })

		expect(result.current.updateRule).toBe(actionsValue.updateRule)

		expect(result.current.addRule).toBe(actionsValue.addRule)

		expect(result.current.remove).toBe(actionsValue.remove)
	})
})

describe('useQueryBuilderContext', () => {
	it('returns the merged state, actions, and current tree', () => {
		const { result } = renderHook(() => useQueryBuilderContext(), { wrapper })

		expect(result.current.fields).toBe(fields)

		expect(result.current.addRule).toBe(actionsValue.addRule)

		expect(result.current.root.type).toBe('group')

		expect(result.current.root.children).toEqual([])
	})
})
