import { describe, expect, it } from 'vitest'
import { DefaultValue } from '../../../../docs/components/api-reference/default-value'
import { bySlot, renderUI } from '../../../helpers'

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
		['null', 'nullish', 'text-zinc-500'],
		['[]', 'array', 'text-sky-700'],
		['{}', 'object', 'text-rose-600'],
	])('colours %s as a %s', (input, _kind, hue) => {
		const { container } = renderUI(<DefaultValue value={input} />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent(input)

		expect(value).toHaveClass(hue)
	})

	it('renders a descriptive default as Markdown with `{@link}` resolved to a name', () => {
		const { container } = renderUI(
			<DefaultValue value="`'horizontal'` inside a {@link Navbar}, otherwise `'vertical'`" />,
		)

		// A descriptive default is prose, not a single coloured literal.
		expect(bySlot(container, 'default-value')).not.toBeInTheDocument()

		expect(bySlot(container, 'doc-description')).toBeInTheDocument()

		expect(container.textContent).toContain('Navbar')

		expect(container.textContent).not.toContain('{@link')

		expect(container.textContent).toContain('horizontal')

		expect(container.textContent).toContain('vertical')
	})
})
