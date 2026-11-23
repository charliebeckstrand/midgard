import summaries from 'virtual:docs/summaries'
import { screen } from '@testing-library/react'
import { Outlet } from 'react-router'
import { describe, expect, it } from 'vitest'
import { summaryText } from '../plugin/summaries.ts'
import { renderShell } from './render-shell.tsx'

// The header shows the summary of the page under its title, in English, as
// the API reference shows the TSDoc (CONVENTIONS.md §13.10).

function renderPage(path: string) {
	return renderShell(path, {
		children: [
			{ id: '/button', path: 'button', Component: () => <p>Button page</p> },
			{ id: '/loading', path: 'loading', Component: () => <p>Loading page</p> },
			{ path: '*', Component: Outlet },
		],
	})
}

/** The paragraph under the title in the header, or `null`. */
function readSummary(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-slot="header"] p')
}

describe('docs page summary', () => {
	it('shows the summary of the page under its title, in English', () => {
		renderPage('/button')

		const summary = readSummary()

		expect(summary?.textContent).toBe(summaryText(summaries['/button'] ?? []))

		expect(summary?.querySelector('[lang="en"]')).not.toBeNull()

		expect(summary?.querySelector('code')?.textContent).toBe('<button>')

		expect(screen.getByRole('heading', { name: 'Button' }).nextElementSibling).toBe(summary)
	})

	it('shows no summary on a page with no base component', () => {
		renderPage('/loading')

		expect(summaries['/loading']).toBeUndefined()

		expect(readSummary()).toBeNull()
	})
})
