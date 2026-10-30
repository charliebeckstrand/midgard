import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderUI, stubMatchMedia } from '../helpers'
import { keyboardSensorAttached } from '../helpers/dnd-kit'
import { lift, SortableHarness } from '../helpers/sortable-harness'

/**
 * Under reduced motion, the sortable reflow must not carry the default
 * dnd-kit inline `transition: transform 200ms ease`. An inline style beats a
 * `motion-reduce:` class, so the hook must drop it itself.
 */
describe('useSortableItem under reduced motion', () => {
	it('gives the displaced items no transition', async () => {
		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		renderUI(<SortableHarness ids={['a', 'b', 'c']} />)

		const grip = screen.getByRole('button', { name: 'a' })

		await lift(grip)

		await act(async () => {
			fireEvent.keyDown(grip, { code: 'ArrowDown', key: 'ArrowDown' })
		})

		await keyboardSensorAttached()

		const transition = screen.getByTestId('b').style.transition

		await act(async () => {
			fireEvent.keyDown(grip, { code: 'Escape', key: 'Escape' })
		})

		expect(transition).toBe('')
	})
})
