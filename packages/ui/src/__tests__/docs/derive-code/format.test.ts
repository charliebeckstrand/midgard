import { createElement, type FunctionComponent } from 'react'
import { describe, expect, it } from 'vitest'
import { formatProps, renderOpenTag } from '../../../docs/derive-code/internals'
import { external, makeContext, tag } from './helpers'

describe('formatProps value handling', () => {
	it.each<[string, Record<string, unknown>, string[]]>([
		['drops undefined / null / false', { a: undefined, b: null, c: false }, []],
		['emits bare key for `true`', { disabled: true }, ['disabled']],
		['quotes plain strings with double quotes', { name: 'alice' }, ['name="alice"']],
		[
			'falls back to JSON-in-braces when a string contains a double quote',
			{ name: 'a"b' },
			['name={"a\\"b"}'],
		],
		[
			'falls back to JSON-in-braces when a string contains a newline',
			{ text: 'line\nbreak' },
			['text={"line\\nbreak"}'],
		],
		['wraps numbers in braces', { count: 7 }, ['count={7}']],
		['drops function-valued props (event handlers, callbacks)', { onClick: () => {} }, []],
		[
			'strips structural / styling props (children, className, key, ref)',
			{ children: 'hi', className: 'p-2', key: 'k', ref: { current: null }, kept: 'yes' },
			['kept="yes"'],
		],
		[
			'formats an array of primitives as a JSON array literal',
			{ tags: ['a', 'b'] },
			['tags={["a", "b"]}'],
		],
		[
			'escapes embedded quotes inside an array of strings',
			{ tags: [`it's`, 'fine'] },
			[`tags={["it's", "fine"]}`],
		],
		[
			'placeholders a Date-valued prop (no recoverable source literal)',
			{ min: new Date('2026-06-07T00:00:00Z') },
			['min={...}'],
		],
		[
			'serializes a flat object of primitives as an object literal',
			{ config: { a: 1 } },
			['config={{ a: 1 }}'],
		],
		[
			'serializes a responsive object preserving authored key order',
			{ columns: { initial: 1, sm: 2, lg: 3 } },
			['columns={{ initial: 1, sm: 2, lg: 3 }}'],
		],
		[
			'double-quotes string values and quotes non-identifier breakpoint keys',
			{ gap: { initial: 'sm', '2xl': 'lg' } },
			['gap={{ initial: "sm", "2xl": "lg" }}'],
		],
		[
			'placeholders an object with a non-primitive value (no clean inline form)',
			{ config: { nested: { x: 1 } } },
			['config={...}'],
		],
		['placeholders an empty object', { config: {} }, ['config={...}']],
		[
			'placeholders arrays containing non-primitive values',
			{ items: [{ id: 1 }] },
			['items={...}'],
		],
	])('%s', (_name, props, expected) => {
		expect(formatProps(props, makeContext())).toEqual(expected)
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
	it.each<[string, Parameters<typeof renderOpenTag>, string]>([
		[
			'returns a self-closing tag when there are no props and no children',
			['Foo', [], '', false],
			'<Foo />',
		],
		[
			'returns an open tag when there are no props but children exist',
			['Foo', [], '', true],
			'<Foo>',
		],
		['inlines short prop lists', ['Foo', ['a="1"', 'b="2"'], '', false], '<Foo a="1" b="2" />'],
	])('%s', (_name, args, expected) => {
		expect(renderOpenTag(...args)).toBe(expected)
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
