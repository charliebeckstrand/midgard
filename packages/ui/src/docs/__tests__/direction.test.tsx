import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { DirectionScript, DirectionSwitch } from '../app/direction.tsx'

// The direction setting of the docs writes `dir` on the root element, and the
// head script writes it again on each load of the tab, before the first paint.

/** Takes `dir` and the setting off after the case, as the window is shared across the files of a worker. */
function resetAfterCase(): void {
	onTestFinished(() => {
		document.documentElement.removeAttribute('dir')

		sessionStorage.clear()
	})
}

/** Runs the head script, as the browser does before the first paint. */
function runScript(): void {
	const { container, unmount } = render(<DirectionScript />)

	new Function(container.querySelector('script')?.textContent ?? '')()

	unmount()
}

describe('the direction setting of the docs', () => {
	it('lays out the site right to left while the switch is on, and keeps the setting for the tab', () => {
		resetAfterCase()

		render(<DirectionSwitch />)

		const toggle = screen.getByRole('switch', { name: 'Right to left' })

		fireEvent.click(toggle)

		expect(document.documentElement.dir).toBe('rtl')

		expect(sessionStorage.getItem('docs:rtl')).toBe('1')

		fireEvent.click(toggle)

		expect(document.documentElement.hasAttribute('dir')).toBe(false)

		expect(sessionStorage.getItem('docs:rtl')).toBeNull()
	})

	it('sets the direction before the first paint of a load in the same tab', () => {
		resetAfterCase()

		runScript()

		expect(document.documentElement.hasAttribute('dir')).toBe(false)

		sessionStorage.setItem('docs:rtl', '1')

		runScript()

		expect(document.documentElement.dir).toBe('rtl')
	})

	it('shows the switch on when the page loaded right to left', () => {
		resetAfterCase()

		document.documentElement.dir = 'rtl'

		render(<DirectionSwitch />)

		expect(screen.getByRole('switch', { name: 'Right to left' })).toHaveProperty('checked', true)
	})
})
