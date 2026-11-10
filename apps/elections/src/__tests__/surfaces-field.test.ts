// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { AppearanceProvider } from 'ui/providers/appearance'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SurfacesField } from '../components/surfaces-field'

// jsdom has no `ResizeObserver`, and the panel of the Listbox measures its trigger.
beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

afterEach(() => {
	cleanup()

	localStorage.clear()

	// The cookie wins over `localStorage`, so each case starts with no cookie.
	// biome-ignore lint/suspicious/noDocumentCookie: the reset expires the cookie that a case wrote.
	document.cookie = 'surfaces=; max-age=0; path=/'

	document.documentElement.classList.remove('surfaces-solid')
})

/** Opens the picker and picks the option named `name`. */
async function pick(name: string) {
	const trigger = screen.getByRole('combobox', { name: 'Surfaces' })

	fireEvent.click(trigger)

	fireEvent.click(await screen.findByRole('option', { name }))
}

describe('SurfacesField', () => {
	it('is glass by default, and marks the root and the cookie while solid', async () => {
		render(h(AppearanceProvider, null, h(SurfacesField)))

		expect(screen.getByRole('combobox', { name: 'Surfaces' }).textContent).toContain('Glass')

		await pick('Solid')

		expect(screen.getByRole('combobox', { name: 'Surfaces' }).textContent).toContain('Solid')

		expect(document.documentElement.classList.contains('surfaces-solid')).toBe(true)

		expect(document.cookie).toContain('surfaces=solid')
	})

	it('shows a stored choice', () => {
		localStorage.setItem('surfaces', 'solid')

		render(h(AppearanceProvider, null, h(SurfacesField)))

		expect(screen.getByRole('combobox', { name: 'Surfaces' }).textContent).toContain('Solid')
	})
})
