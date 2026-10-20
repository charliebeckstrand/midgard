// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { hashKeys } from '../../modules/grid/engine/grid-table/state'

describe('hashKeys', () => {
	it('keeps the fingerprint when the same keys change order, as a sort does', () => {
		expect(hashKeys(['a', 'b', 'c', 1, 2])).toBe(hashKeys([2, 'c', 1, 'a', 'b']))
	})

	it('changes the fingerprint when a key between the ends changes', () => {
		expect(hashKeys(['a', 'b', 'c'])).not.toBe(hashKeys(['a', 'x', 'c']))
	})

	it('changes the fingerprint when the count changes', () => {
		expect(hashKeys(['a', 'b'])).not.toBe(hashKeys(['a', 'b', 'b']))
	})

	it('tells apart two sets whose repeated keys cancel in the exclusive or', () => {
		expect(hashKeys(['a', 'a'])).not.toBe(hashKeys(['b', 'b']))
	})
})
