import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFail } from '../../hooks/use-fail'
import { FailBoundary } from '../helpers/fail-boundary.tsx'

/** A button that gives the error of `run` to the hook when the reader presses it. */
function Probe({ run }: { run: (fail: (error: unknown) => void) => void }) {
	const fail = useFail()

	return (
		<button type="button" onClick={() => run(fail)}>
			Run
		</button>
	)
}

describe('useFail', () => {
	it('renders the children until an error comes', () => {
		render(
			<FailBoundary>
				<Probe run={() => {}} />
			</FailBoundary>,
		)

		expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy()

		expect(screen.queryByText('Failed')).toBeNull()
	})

	it('gives an error from an event handler to the error boundary', () => {
		// React writes the caught error to the console.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		render(
			<FailBoundary>
				<Probe run={(fail) => fail(new Error('handler'))} />
			</FailBoundary>,
		)

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'Run' }))
		})

		expect(screen.getByText('Failed')).toBeTruthy()
	})

	it('gives the error of a rejected promise to the error boundary', async () => {
		// React writes the caught error to the console.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		render(
			<FailBoundary>
				<Probe run={(fail) => Promise.reject(new Error('load')).catch(fail)} />
			</FailBoundary>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Run' }))
		})

		expect(await screen.findByText('Failed')).toBeTruthy()
	})
})
