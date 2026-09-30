import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAriaIds } from '../../hooks/use-aria-ids'

describe('useAriaIds', () => {
	it.each<[string, Parameters<typeof useAriaIds>, string | undefined]>([
		['joins truthy ids with a single space', ['a', 'b', 'c'], 'a b c'],
		['drops falsy tokens', ['a', false, undefined, null, 'b'], 'a b'],
		['returns undefined when nothing is present', [false, undefined, null], undefined],
	])('%s', (_name, ids, expected) => {
		const { result } = renderHook(() => useAriaIds(...ids))

		expect(result.current).toBe(expected)
	})
})
