import { act } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Example } from '../components/example'
import { fireEvent, renderUI, screen } from './helpers'

const QUIET = {
	autocomplete: 'off',
	autocorrect: 'off',
	autocapitalize: 'off',
	spellcheck: 'false',
}

function expectQuiet(field: HTMLElement) {
	for (const [name, value] of Object.entries(QUIET)) expect(field).toHaveAttribute(name, value)
}

function Swap() {
	const [shown, setShown] = useState(false)

	return (
		<>
			<button type="button" onClick={() => setShown(true)}>
				Show
			</button>
			{shown && <textarea aria-label="Late" />}
		</>
	)
}

describe('noAutofill', () => {
	it('quiets each text field in the frame of an example', () => {
		renderUI(
			<Example>
				<input aria-label="Name" autoComplete="name" />
				<input aria-label="Agree" type="checkbox" />
			</Example>,
		)

		expectQuiet(screen.getByLabelText('Name'))

		expect(screen.getByLabelText('Agree')).not.toHaveAttribute('autocomplete')
	})

	it('quiets a field that mounts later', async () => {
		renderUI(
			<Example>
				<Swap />
			</Example>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Show' }))

		// The observer runs in a microtask after the commit.
		await act(async () => {})

		expectQuiet(screen.getByLabelText('Late'))
	})

	it('restores an attribute that a prop writes over', async () => {
		const { rerender } = renderUI(
			<Example>
				<input aria-label="Phone" autoComplete="tel" />
			</Example>,
		)

		rerender(
			<Example>
				<input aria-label="Phone" autoComplete="postal-code" />
			</Example>,
		)

		await act(async () => {})

		expectQuiet(screen.getByLabelText('Phone'))
	})
})
