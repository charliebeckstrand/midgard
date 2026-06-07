import { createElement, type FunctionComponent } from 'react'
import { describe, expect, it } from 'vitest'
import { formatProps, renderOpenTag } from '../../../docs/derive-code/format'
import type { ComponentInfo, Context } from '../../../docs/derive-code/types'

function tag<P>(name: string, mod: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Object.assign(Component, { __name: name, __module: mod, displayName: name })

	return Component
}

function readTag(type: unknown): ComponentInfo | undefined {
	const tag = type as { __name?: unknown; __module?: unknown }

	if (typeof tag?.__name !== 'string' || typeof tag?.__module !== 'string') return undefined

	return { name: tag.__name, module: tag.__module }
}

function emptyContext(): Context {
	return {
		registry: { byType: { get: readTag }, byName: new Map() },
		imports: new Map(),
	}
}

describe('formatProps value handling', () => {
	it('drops undefined / null / false', () => {
		const result = formatProps({ a: undefined, b: null, c: false }, emptyContext())

		expect(result).toEqual([])
	})

	it('emits bare key for `true`', () => {
		const result = formatProps({ disabled: true }, emptyContext())

		expect(result).toEqual(['disabled'])
	})

	it('quotes plain strings with double quotes', () => {
		const result = formatProps({ name: 'alice' }, emptyContext())

		expect(result).toEqual(['name="alice"'])
	})

	it('falls back to JSON-in-braces when a string contains a double quote', () => {
		const result = formatProps({ name: 'a"b' }, emptyContext())

		expect(result).toEqual(['name={"a\\"b"}'])
	})

	it('falls back to JSON-in-braces when a string contains a newline', () => {
		const result = formatProps({ text: 'line\nbreak' }, emptyContext())

		expect(result).toEqual(['text={"line\\nbreak"}'])
	})

	it('wraps numbers in braces', () => {
		const result = formatProps({ count: 7 }, emptyContext())

		expect(result).toEqual(['count={7}'])
	})

	it('drops function-valued props (event handlers, callbacks)', () => {
		const result = formatProps({ onClick: () => {} }, emptyContext())

		expect(result).toEqual([])
	})

	it('strips structural / styling props (children, className, key, ref)', () => {
		const result = formatProps(
			{
				children: 'hi',
				className: 'p-2',
				key: 'k',
				ref: { current: null },
				kept: 'yes',
			},
			emptyContext(),
		)

		expect(result).toEqual(['kept="yes"'])
	})

	it('formats an array of primitives as a JSON array literal', () => {
		const result = formatProps({ tags: ['a', 'b'] }, emptyContext())

		expect(result).toEqual(['tags={["a", "b"]}'])
	})

	it('escapes embedded quotes inside an array of strings', () => {
		const result = formatProps({ tags: [`it's`, 'fine'] }, emptyContext())

		expect(result).toEqual([`tags={["it's", "fine"]}`])
	})

	it('drops arrays containing non-primitive values', () => {
		const result = formatProps({ items: [{ id: 1 }] }, emptyContext())

		expect(result).toEqual([])
	})

	it('renders an element-valued prop using the registry tag', () => {
		const Icon = tag<{ name?: string }>('Icon', 'icon')

		const result = formatProps({ icon: createElement(Icon, { name: 'star' }) }, emptyContext())

		expect(result).toEqual(['icon={<Icon name="star" />}'])
	})

	it('drops element-valued props whose type is unregistered and non-intrinsic', () => {
		const Unknown = (() => null) as FunctionComponent

		const result = formatProps({ icon: createElement(Unknown) }, emptyContext())

		expect(result).toEqual([])
	})

	it('renders an intrinsic element-valued prop using its tag name', () => {
		const result = formatProps({ icon: createElement('div') }, emptyContext())

		expect(result).toEqual(['icon={<div />}'])
	})
})

describe('renderOpenTag layout', () => {
	it('returns a self-closing tag when there are no props and no children', () => {
		expect(renderOpenTag('Foo', [], '', false)).toBe('<Foo />')
	})

	it('returns an open tag when there are no props but children exist', () => {
		expect(renderOpenTag('Foo', [], '', true)).toBe('<Foo>')
	})

	it('inlines short prop lists', () => {
		expect(renderOpenTag('Foo', ['a="1"', 'b="2"'], '', false)).toBe('<Foo a="1" b="2" />')
	})

	it('breaks props onto separate lines when the inline form would exceed 80 cols', () => {
		const longProp = `label="${'x'.repeat(80)}"`

		const result = renderOpenTag('Foo', [longProp, 'b="2"'], '', false)

		expect(result).toContain('\n')

		expect(result.split('\n')).toHaveLength(4) // open + 2 props + closing brace line

		expect(result).toContain('  label=') // INDENT prefix on multi-line form

		expect(result.trimEnd().endsWith('/>')).toBe(true)
	})

	it('respects an outer indent when breaking onto multiple lines', () => {
		const longProp = `label="${'x'.repeat(80)}"`

		const result = renderOpenTag('Foo', [longProp, 'b="2"'], '\t', true)

		const lines = result.split('\n')

		expect(lines[0]).toBe('<Foo')

		expect(lines[lines.length - 1]).toBe('\t>')
	})
})
