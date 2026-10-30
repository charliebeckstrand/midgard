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

	it('says when the component takes no props of its own', () => {
		render(<ApiEntry component={{ name: 'Spacer', props: [], events: [] }} />)

		expect(screen.getByText('This component takes no props of its own.')).toBeDefined()
	})
})
