import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect } from 'vitest'
import { it } from '../../__tests__/helpers/fake-clock'
import ControlledValues from '../pages/modules/form/controlled-values.tsx'

// The form syncs `values` only on a change of reference. So each press of
// Clear must give a new reference, also when the form shows no profile.

function setup() {
	render(<ControlledValues />)

	const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement

	const clear = screen.getByRole('button', { name: 'Clear' })

	return { name, clear }
}

describe('ControlledValues', () => {
	it('clears typed text before a profile loads', () => {
		const { name, clear } = setup()

		fireEvent.change(name, { target: { value: 'Typed' } })

		expect(name.value).toBe('Typed')

		fireEvent.click(clear)

		expect(name.value).toBe('')
	})

	it('clears typed text on a second Clear after a load', async ({ clock }) => {
		const { name, clear } = setup()

		fireEvent.click(screen.getByRole('button', { name: 'Load profile' }))

		await clock.advance(1000)

		expect(name.value).toBe('Arlene McCoy')

		fireEvent.click(clear)

		expect(name.value).toBe('')

		fireEvent.change(name, { target: { value: 'Typed' } })

		fireEvent.click(clear)

		expect(name.value).toBe('')
	})
})
