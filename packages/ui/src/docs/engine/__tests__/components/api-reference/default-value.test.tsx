import { describe, expect, it } from 'vitest'
import { DefaultValue, literalBlock } from '../../../components/api-reference/default-value'
import { bySlot, renderUI } from '../../helpers'

describe('literalBlock', () => {
	it('puts each entry of an object on its own line', () => {
		expect(literalBlock('`{ toolbar: false, contextMenu: true }`')).toBe(
			['{', '  toolbar: false,', '  contextMenu: true,', '}'].join('\n'),
		)
	})

	it('gives an unquoted object the same block', () => {
		expect(literalBlock('{ today: true, clear: true }')).toBe(
			['{', '  today: true,', '  clear: true,', '}'].join('\n'),
		)
	})

	it('puts each object of an array on one line, and resets the authored indent', () => {
		const source = [
			'[',
			"\t{ id: 'length', test: (v) => v.length >= 8 },",
			"\t{\n\t\tid: 'number',\n\t\ttest: (v) => /\\d/.test(v),\n\t},",
			']',
		].join('\n')

		expect(literalBlock(source)).toBe(
			[
				'[',
				"  { id: 'length', test: (v) => v.length >= 8 },",
				"  { id: 'number', test: (v) => /\\d/.test(v) },",
				']',
			].join('\n'),
		)
	})

	it.each([
		["`['csv', 'excel']`", 'an array of primitives'],
		['`[]`', 'an empty array'],
		['{}', 'an empty object'],
		["'solid'", 'a string'],
		['{@link Foo}', 'a link'],
	])('keeps %s on one line: %s', (input) => {
		expect(literalBlock(input)).toBeNull()
	})
})

describe('DefaultValue', () => {
	it('renders a string literal as bare text in the string hue', () => {
		const { container } = renderUI(<DefaultValue value="'solid'" />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent("'solid'")

		expect(value).toHaveClass('text-emerald-700')
	})

	it('unwraps a backtick-quoted default to its literal', () => {
		const { container } = renderUI(<DefaultValue value="`'md'`" />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent("'md'")

		expect(value).toHaveClass('text-emerald-700')
	})

	it.each([
		['true', 'boolean', 'text-violet-600'],
		['42', 'number', 'text-amber-700'],
		['null', 'nullish', 'text-mist-600'],
		['[]', 'array', 'text-sky-600'],
		['{}', 'object', 'text-rose-600'],
	])('colors %s as a %s', (input, _kind, hue) => {
		const { container } = renderUI(<DefaultValue value={input} />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent(input)

		expect(value).toHaveClass(hue)
	})

	it('renders an object as a block in the object hue', () => {
		const { container } = renderUI(<DefaultValue value="`{ w: 8, h: 18 }`" />)

		const value = bySlot(container, 'default-value')

		expect(value?.tagName).toBe('PRE')

		expect(value?.textContent).toBe(['{', '  w: 8,', '  h: 18,', '}'].join('\n'))

		expect(value).toHaveClass('text-rose-600')
	})

	it('renders a quoted-literal union as prose, not one colored string', () => {
		const { container } = renderUI(<DefaultValue value="'start' | 'end'" />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent("'start' | 'end'")

		// Not a single self-contained literal: no mono/emerald on the whole span.
		expect(value).not.toHaveClass('font-mono')

		expect(value).not.toHaveClass('text-emerald-700')
	})

	it('renders a bare {@link} default as a resolved link, not an object literal', () => {
		const { container } = renderUI(<DefaultValue value="{@link Foo}" />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent('Foo')

		expect(container.textContent).not.toContain('{@link')

		expect(value).not.toHaveClass('text-rose-600')
	})

	it('renders a JSX/element default verbatim in monospace, not a blank cell', () => {
		const { container } = renderUI(<DefaultValue value="<TableEmptyAlert />" />)

		const value = bySlot(container, 'default-value')

		// Inline Markdown reads the tag as raw HTML and drops it; it must survive.
		expect(value).toHaveTextContent('<TableEmptyAlert />')

		expect(value?.querySelector('code')).toBeInTheDocument()
	})

	it('renders a descriptive default as prose, coloring literals and resolving links', () => {
		const { container } = renderUI(
			<DefaultValue value="`'horizontal'` inside a {@link NavBar}, otherwise `'vertical'`" />,
		)

		const value = bySlot(container, 'default-value')

		expect(value).toBeInTheDocument()

		// The `{@link}` collapses to the bare name; the prose renders in flow.
		expect(value).toHaveTextContent("'horizontal' inside a NavBar, otherwise 'vertical'")

		expect(container.textContent).not.toContain('{@link')

		// Each backtick literal renders bare in the string hue.
		const literals = Array.from(value?.querySelectorAll('code') ?? [])

		expect(literals.map((el) => el.textContent)).toEqual(["'horizontal'", "'vertical'"])

		for (const literal of literals) expect(literal).toHaveClass('text-emerald-700')
	})
})
