import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { QueryField } from '../../modules/query/engine/types'
import type { QueryBuilderActions } from '../../modules/query/query-builder/context'
import {
	QueryBuilderProvider,
	useQueryBuilderActions,
	useQueryBuilderState,
} from '../../modules/query/query-builder/context'

const fields: QueryField[] = [{ name: 'title', label: 'Title', type: 'text' }]

const stateValue = {
	fields,
	getField: (name: string) => fields.find((f) => f.name === name),
	disabled: false,
	allowGroups: true,
	hideFieldSelector: false,
	orientation: 'horizontal' as const,
	requireRule: false,
	reorderable: false,
}

const actionsValue: QueryBuilderActions = {
	updateRule: () => {},
	updateCombinator: () => {},
	addRule: () => {},
	addGroup: () => {},
	remove: () => {},
	move: () => {},
}

function wrapper({ children }: { children: React.ReactNode }) {
	return (
		<QueryBuilderProvider state={stateValue} actions={actionsValue} register={() => {}}>
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
