// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { rowsSignatureOf } from '../../modules/grid/engine/grid-table/state'

describe('rowsSignatureOf', () => {
	it('keeps the fingerprint when the same keys change order, as a sort does', () => {
		expect(rowsSignatureOf(['a', 'b', 'c', 1, 2])).toBe(rowsSignatureOf([2, 'c', 1, 'a', 'b']))
	})

	it('changes the fingerprint when a key between the ends changes', () => {
		expect(rowsSignatureOf(['a', 'b', 'c'])).not.toBe(rowsSignatureOf(['a', 'x', 'c']))
	})

	it('changes the fingerprint when the count changes', () => {
		expect(rowsSignatureOf(['a', 'b'])).not.toBe(rowsSignatureOf(['a', 'b', 'b']))
	})

	it('tells apart two sets whose repeated keys cancel in the exclusive or', () => {
		expect(rowsSignatureOf(['a', 'a'])).not.toBe(rowsSignatureOf(['b', 'b']))
	})
})
