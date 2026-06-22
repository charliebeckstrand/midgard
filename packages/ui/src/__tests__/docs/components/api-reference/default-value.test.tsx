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
		['null', 'nullish', 'text-mist-600'],
		['[]', 'array', 'text-sky-600'],
		['{}', 'object', 'text-rose-600'],
	])('colours %s as a %s', (input, _kind, hue) => {
		const { container } = renderUI(<DefaultValue value={input} />)

		const value = bySlot(container, 'default-value')

		expect(value).toHaveTextContent(input)

		expect(value).toHaveClass(hue)
	})

	it('renders a descriptive default as prose, colouring literals and resolving links', () => {
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
