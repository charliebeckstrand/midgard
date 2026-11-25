import { describe, expect, it } from 'vitest'
import { describeValue } from './describe-value'

describe('describeValue', () => {
	it('gives each field of an object, where String gives [object Object]', () => {
		expect(describeValue([{ x: 1, open: true }])).toBe('[{"x":1,"open":true}]')
	})

	it('keeps NaN and the infinities, which JSON writes as null', () => {
		expect(describeValue({ width: Number.NaN, end: Number.POSITIVE_INFINITY })).toBe(
			'{"width":"NaN","end":"Infinity"}',
		)
	})

	it('names an element as describeNode does, where JSON writes {}', () => {
		const panel = document.createElement('div')

		panel.setAttribute('data-slot', 'panel')

		expect(describeValue({ focus: panel })).toBe('{"focus":"div[data-slot=\\"panel\\"]"}')
	})

	it('gives the entries of a Map and the values of a Set, where JSON writes {}', () => {
		expect(describeValue(new Map([['a', 1]]))).toBe('{"Map":[["a",1]]}')

		expect(describeValue(new Set(['b']))).toBe('{"Set":["b"]}')
	})

	it('gives the name and the message of an error, and the digits of a bigint', () => {
		expect(describeValue({ error: new RangeError('out of range'), size: 12n })).toBe(
			'{"error":"RangeError: out of range","size":"12n"}',
		)
	})

	it('marks a cycle, where JSON throws', () => {
		const node: { name: string; self?: unknown } = { name: 'root' }

		node.self = node

		expect(describeValue(node)).toBe('{"name":"root","self":"[Circular]"}')
	})

	it('gives the text of a value that JSON does not write', () => {
		expect(describeValue(undefined)).toBe('undefined')
	})

	it('keeps the start and the end of a long text', () => {
		const samples = Array.from({ length: 400 }, (_, at) => at)

		const text = describeValue(samples)

		expect(text.startsWith('[0,1,2,')).toBe(true)

		expect(text.endsWith(',397,398,399]')).toBe(true)

		expect(text).toMatch(/ … \(\d+ characters\) … /)
	})
})
