// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { AppearanceProvider } from 'ui/providers/appearance'
import { afterEach, describe, expect, it } from 'vitest'
import { GlassSwitch } from '../components/glass-switch'

afterEach(() => {
	cleanup()

	localStorage.clear()

	document.documentElement.classList.remove('glass-off')
})

describe('GlassSwitch', () => {
	it('is on by default, and turns the glass off on the root and in the cookie, then on again', () => {
		render(h(AppearanceProvider, null, h(GlassSwitch)))

		const glass = screen.getByRole('switch', { name: 'Glass surfaces' })

		expect(glass.getAttribute('aria-checked')).toBe('true')

		fireEvent.click(glass)

		expect(glass.getAttribute('aria-checked')).toBe('false')

		expect(document.documentElement.classList.contains('glass-off')).toBe(true)

		expect(document.cookie).toContain('glass=off')

		fireEvent.click(glass)

		expect(glass.getAttribute('aria-checked')).toBe('true')

		expect(document.documentElement.classList.contains('glass-off')).toBe(false)
	})
})
