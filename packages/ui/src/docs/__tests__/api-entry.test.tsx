import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ApiEntry } from '../kit/api-entry.tsx'

// The fixed text around the API data of a component (CONVENTIONS.md §13.9).

describe('ApiEntry', () => {
	it('names the HTML attributes that the component also takes', () => {
		const { container } = render(
			<ApiEntry component={{ name: 'Box', props: [], events: [], elements: ['div'] }} />,
		)

		expect(container.textContent).toContain('Also takes the HTML attributes of <div>.')
	})

	it('says when the component takes no props of its own', () => {
		render(<ApiEntry component={{ name: 'Spacer', props: [], events: [] }} />)

		expect(screen.getByText('This component takes no props of its own.')).toBeDefined()
	})
})
