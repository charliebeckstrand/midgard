import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiEntry } from '../kit/api-entry.tsx'

// The fixed text around the API data of a component (CONVENTIONS.md §13.9).

describe('ApiEntry', () => {
	it('lists each tag as code', () => {
		const { container } = render(
			<ApiEntry component={{ name: 'Box', props: [], events: [], elements: ['div', 'span'] }} />,
		)

		expect(container.textContent).toContain('Also takes the HTML attributes of <div>, <span>.')

		expect([...container.querySelectorAll('code')].map((code) => code.textContent)).toEqual([
			'<div>',
			'<span>',
		])
	})

	it('shows the default of a prop as code in its sentence', () => {
		const { container } = render(
			<ApiEntry
				component={{
					name: 'Box',
					props: [{ name: 'size', type: 'string', default: "'md'" }],
					events: [],
				}}
			/>,
		)

		const fallback = [...container.querySelectorAll('code')].find(
			(code) => code.textContent === "'md'",
		)

		expect(fallback?.parentElement?.textContent).toBe("default 'md'")
	})

	// Code and the English TSDoc are left-to-right text. On a right-to-left
	// page with no `dir`, `<div>` shows as `</ div>`, and the period of a
	// sentence shows at its start. jsdom has no layout, so the test reads the `dir`.
	it('keeps each code name and the TSDoc left to right on a right-to-left page', () => {
		const { container } = render(
			<div dir="rtl">
				<ApiEntry
					component={{
						name: 'Box',
						description: 'A box.',
						props: [
							{ name: 'tone', values: ['soft', 'solid'] },
							{ name: 'render', type: '(value: T) => ReactNode', default: "'md'" },
						],
						events: [],
						elements: ['div'],
					}}
				/>
			</div>,
		)

		const codes = [...container.querySelectorAll('code')]

		expect(codes.map((code) => code.textContent)).toEqual([
			"'soft'",
			"'solid'",
			'(value: T) => ReactNode',
			"'md'",
			'<div>',
		])

		for (const code of codes) expect(code.getAttribute('dir')).toBe('ltr')

		const prose = [...container.querySelectorAll('[lang="en"]')]

		expect(prose).toHaveLength(1)

		for (const text of prose) expect(text.getAttribute('dir')).toBe('ltr')
	})

	it('says when the component takes no props of its own', () => {
		render(<ApiEntry component={{ name: 'Spacer', props: [], events: [] }} />)

		expect(screen.getByText('This component takes no props of its own.')).toBeDefined()
	})
})
