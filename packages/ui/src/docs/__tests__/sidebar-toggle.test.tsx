import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setupUser } from '../../__tests__/helpers/setup-user.ts'
import { renderShell } from './helpers/render-shell.tsx'

// At `lg` and up, the button in the header shows or hides the sidebar. It is a
// disclosure, so it tells a screen reader if the sidebar shows.

describe('docs sidebar toggle', () => {
	it('tells if the sidebar shows', async () => {
		const user = setupUser()

		renderShell('/', { children: [{ index: true, Component: () => null }] })

		const toggle = screen.getByRole('button', { name: 'Toggle sidebar' })

		expect(toggle.getAttribute('aria-expanded')).toBe('true')

		await user.click(toggle)

		expect(toggle.getAttribute('aria-expanded')).toBe('false')

		await user.click(toggle)

		expect(toggle.getAttribute('aria-expanded')).toBe('true')
	})
})
