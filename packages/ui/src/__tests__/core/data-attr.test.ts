// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dataAttr } from '../../core/data-attr'

describe('dataAttr', () => {
	it.each([
		[true, ''],
		[false, undefined],
		[undefined, undefined],
	])('maps the flag %s to %j', (flag, expected) => {
		expect(dataAttr(flag)).toBe(expected)
	})
})
