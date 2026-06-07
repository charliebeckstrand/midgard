import { createElement, Fragment, type FunctionComponent } from 'react'
import { describe, expect, it } from 'vitest'
import {
	collectChildItems,
	elementChildren,
	getElementName,
	isPassThrough,
	isPrimitive,
} from '../../../docs/derive-code/tree'
import { makeContext, tag } from './helpers'

describe('isPrimitive', () => {
	it('accepts strings, numbers, and booleans', () => {
		expect(isPrimitive('hi')).toBe(true)

		expect(isPrimitive(0)).toBe(true)

		expect(isPrimitive(false)).toBe(true)
	})

	it('rejects null, undefined, objects, and arrays', () => {
		expect(isPrimitive(null)).toBe(false)

		expect(isPrimitive(undefined)).toBe(false)

		expect(isPrimitive({})).toBe(false)

		expect(isPrimitive([])).toBe(false)
	})
})

describe('isPassThrough', () => {
	it('treats Fragment as pass-through', () => {
		expect(isPassThrough(createElement(Fragment, null, 'x'))).toBe(true)
	})

	it('treats intrinsic HTML elements as pass-through', () => {
		expect(isPassThrough(createElement('div', null, 'x'))).toBe(true)

		expect(isPassThrough(createElement('span', null, 'x'))).toBe(true)
	})

	it('treats recognized components as non-pass-through', () => {
		const Button = tag('Button', 'button')

		expect(isPassThrough(createElement(Button))).toBe(false)
	})
})

describe('elementChildren', () => {
	it('returns an array view over `children`', () => {
		const tree = createElement('div', null, 'a', 'b')

		expect(elementChildren(tree)).toEqual(['a', 'b'])
	})

	it('returns an empty array when there are no children', () => {
		expect(elementChildren(createElement('div'))).toEqual([])
	})
})

describe('collectChildItems text handling', () => {
	it('coalesces adjacent text children into one item', () => {
		const items = collectChildItems(['Hello ', 'world'])

		expect(items).toEqual([{ kind: 'text', value: 'Hello world' }])
	})

	it('stringifies numbers into text', () => {
		const items = collectChildItems(['count: ', 5])

		expect(items).toEqual([{ kind: 'text', value: 'count: 5' }])
	})

	it('skips whitespace-only string children', () => {
		const items = collectChildItems(['   ', '\n\n'])

		expect(items).toEqual([])
	})
})

describe('collectChildItems element handling', () => {
	it('emits non-pass-through elements as element items in source order', () => {
		const Button = tag('Button', 'button')

		const Icon = tag('Icon', 'icon')

		const items = collectChildItems([
			createElement(Button, { key: 'b' }),
			createElement(Icon, { key: 'i' }),
		])

		expect(items.map((i) => i.kind)).toEqual(['element', 'element'])
	})

	it('flattens pass-through wrappers (Fragment, div) into their children', () => {
		const Button = tag('Button', 'button')

		const items = collectChildItems([
			createElement(Fragment, null, createElement(Button, { key: 'b' })),
		])

		expect(items).toHaveLength(1)

		expect(items[0]?.kind).toBe('element')
	})

	it('merges text inside a pass-through wrapper into the outer text buffer', () => {
		const items = collectChildItems([createElement('span', { key: 'a' }, 'Hi'), ' there'])

		expect(items).toEqual([{ kind: 'text', value: 'Hi there' }])
	})

	it('preserves source order across mixed text + element + text', () => {
		const Button = tag('Button', 'button')

		const items = collectChildItems(['Before', createElement(Button, { key: 'b' }), 'After'])

		expect(items.map((i) => i.kind)).toEqual(['text', 'element', 'text'])

		expect((items[0] as { kind: 'text'; value: string }).value).toBe('Before')

		expect((items[2] as { kind: 'text'; value: string }).value).toBe('After')
	})
})

describe('getElementName', () => {
	it('returns the registry name for a recognized component', () => {
		const Button = tag('Button', 'button')

		const context = makeContext()

		expect(getElementName(createElement(Button), context)).toBe('Button')
	})

	it('returns the tag name for an intrinsic element', () => {
		const context = makeContext()

		expect(getElementName(createElement('div'), context)).toBe('div')
	})

	it('returns null for an unrecognized non-intrinsic component', () => {
		const Unknown = (() => null) as FunctionComponent

		const context = makeContext()

		expect(getElementName(createElement(Unknown), context)).toBeNull()
	})
})
