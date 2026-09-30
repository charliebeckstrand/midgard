// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
	splitTopLevel,
	splitUnion,
	unquote,
} from '../../../components/api-reference/type-references'

describe('splitUnion', () => {
	it('splits on top-level bars only', () => {
		expect(splitUnion("'sm' | 'md' | Array<'a' | 'b'>")).toEqual([
			"'sm'",
			"'md'",
			"Array<'a' | 'b'>",
		])
	})

	it('keeps a bar inside a string literal', () => {
		expect(splitUnion("'a|b' | 'c'")).toEqual(["'a|b'", "'c'"])
	})

	it('keeps an arrow function whole', () => {
		expect(splitUnion('(open: boolean) => void')).toEqual(['(open: boolean) => void'])
	})
})

describe('splitTopLevel', () => {
	it('splits value entries on top-level commas only', () => {
		expect(splitTopLevel("a: [1, 2], b: { c: 'x, y' }", ',', false)).toEqual([
			'a: [1, 2]',
			"b: { c: 'x, y' }",
		])
	})

	it('reads a comparison in a value as an operator, not as nesting', () => {
		expect(splitTopLevel('test: (v) => v.length >= 8, id: 1', ',', false)).toEqual([
			'test: (v) => v.length >= 8',
			'id: 1',
		])
	})
})

describe('unquote', () => {
	it.each([
		["'md'", 'md'],
		['"md"', 'md'],
		['`md`', 'md'],
		['md', 'md'],
	])('%s → %s', (input, expected) => {
		expect(unquote(input)).toBe(expected)
	})
})
