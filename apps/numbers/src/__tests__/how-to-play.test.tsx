// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it } from 'vitest'
import { HowToPlay } from '../components/how-to-play'

afterEach(cleanup)

describe('HowToPlay', () => {
	it('opens the How to play dialog from its button, with the rules of each mode', async () => {
		render(
			<UIProvider>
				<HowToPlay />
			</UIProvider>,
		)

		expect(screen.queryByRole('dialog')).toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'How to play' }))

		const dialog = await screen.findByRole('dialog', { name: 'How to play' })

		expect(Array.from(dialog.querySelectorAll('h3'), (heading) => heading.textContent)).toEqual([
			'Vs CPU',
			'Daily puzzle',
		])

		expect(dialog.textContent).toContain('Each run draws 20 numbers between 1 and 1000')
	})
})
