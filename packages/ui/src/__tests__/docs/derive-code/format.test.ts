import { createElement, type FunctionComponent } from 'react'
import { describe, expect, it } from 'vitest'
import { formatProps, renderOpenTag } from '../../../docs/derive-code/internals'
import { external, makeContext, tag } from './helpers'

describe('formatProps value handling', () => {
	it('drops undefined / null / false', () => {
		const result = formatProps({ a: undefined, b: null, c: false }, makeContext())

		expect(result).toEqual([])
	})

	it('emits bare key for `true`', () => {
		const result = formatProps({ disabled: true }, makeContext())

		expect(result).toEqual(['disabled'])
	})

	it('quotes plain strings with double quotes', () => {
		const result = formatProps({ name: 'alice' }, makeContext())

		expect(result).toEqual(['name="alice"'])
	})

	it('falls back to JSON-in-braces when a string contains a double quote', () => {
		const result = formatProps({ name: 'a"b' }, makeContext())

		expect(result).toEqual(['name={"a\\"b"}'])
	})

	it('falls back to JSON-in-braces when a string contains a newline', () => {
		const result = formatProps({ text: 'line\nbreak' }, makeContext())

		expect(result).toEqual(['text={"line\\nbreak"}'])
	})

	it('wraps numbers in braces', () => {
		const result = formatProps({ count: 7 }, makeContext())

		expect(result).toEqual(['count={7}'])
	})

	it('drops function-valued props (event handlers, callbacks)', () => {
		const result = formatProps({ onClick: () => {} }, makeContext())

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
			makeContext(),
		)

		expect(result).toEqual(['kept="yes"'])
	})

	it('formats an array of primitives as a JSON array literal', () => {
		const result = formatProps({ tags: ['a', 'b'] }, makeContext())

		expect(result).toEqual(['tags={["a", "b"]}'])
	})

	it('escapes embedded quotes inside an array of strings', () => {
		const result = formatProps({ tags: [`it's`, 'fine'] }, makeContext())

		expect(result).toEqual([`tags={["it's", "fine"]}`])
	})

	it('placeholders a Date-valued prop (no recoverable source literal)', () => {
		const result = formatProps({ min: new Date('2026-06-07T00:00:00Z') }, makeContext())

		expect(result).toEqual(['min={...}'])
	})

	it('serializes a flat object of primitives as an object literal', () => {
		const result = formatProps({ config: { a: 1 } }, makeContext())

		expect(result).toEqual(['config={{ a: 1 }}'])
	})

	it('serializes a responsive object preserving authored key order', () => {
		const result = formatProps({ columns: { initial: 1, sm: 2, lg: 3 } }, makeContext())

		expect(result).toEqual(['columns={{ initial: 1, sm: 2, lg: 3 }}'])
	})

	it('double-quotes string values and quotes non-identifier breakpoint keys', () => {
		const result = formatProps({ gap: { initial: 'sm', '2xl': 'lg' } }, makeContext())

		expect(result).toEqual(['gap={{ initial: "sm", "2xl": "lg" }}'])
	})

	it('placeholders an object with a non-primitive value (no clean inline form)', () => {
		const result = formatProps({ config: { nested: { x: 1 } } }, makeContext())

		expect(result).toEqual(['config={...}'])
	})

	it('placeholders an empty object', () => {
		const result = formatProps({ config: {} }, makeContext())

		expect(result).toEqual(['config={...}'])
	})

	it('placeholders arrays containing non-primitive values', () => {
		const result = formatProps({ items: [{ id: 1 }] }, makeContext())

		expect(result).toEqual(['items={...}'])
	})

	it('renders an element-valued prop using the registry tag and records its import', () => {
		const Icon = tag<{ name?: string }>('Icon', 'icon')

		const context = makeContext()

		const result = formatProps({ icon: createElement(Icon, { name: 'star' }) }, context)

		expect(result).toEqual(['icon={<Icon name="star" />}'])

		expect(context.imports.get('icon')).toEqual(new Set(['Icon']))
	})

	it('resolves an external element-valued prop by displayName and records its import', () => {
		const Star = external('Star')

		const context = makeContext({
			byName: new Map([['Star', { name: 'Star', module: 'lucide-react', external: true }]]),
		})

		const result = formatProps({ icon: createElement(Star) }, context)

		expect(result).toEqual(['icon={<Star />}'])

		expect(context.imports.get('lucide-react')).toEqual(new Set(['Star']))

		expect(context.externalModules.has('lucide-react')).toBe(true)
	})

	it('drops a displayName match against a non-external byName entry', () => {
		// A demo-local stand-in sharing a ui component's name must not resolve
		// to the real component's import.
		const Impostor = external('Button')

		const context = makeContext({
			byName: new Map([['Button', { name: 'Button', module: 'button' }]]),
		})

		expect(formatProps({ icon: createElement(Impostor) }, context)).toEqual([])
	})

	it('drops element-valued props whose type is unregistered and non-intrinsic', () => {
		const Unknown = (() => null) as FunctionComponent

		const result = formatProps({ icon: createElement(Unknown) }, makeContext())

		expect(result).toEqual([])
	})

	it('renders an intrinsic element-valued prop using its tag name', () => {
		const result = formatProps({ icon: createElement('div') }, makeContext())

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
