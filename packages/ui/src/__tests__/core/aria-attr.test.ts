// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ariaAttr } from '../../core/aria-attr'

describe('ariaAttr', () => {
	it.each([
		[true, true],
		[false, undefined],
		[undefined, undefined],
	])('maps the flag %s to %s', (flag, expected) => {
		expect(ariaAttr(flag)).toBe(expected)
	})
})
