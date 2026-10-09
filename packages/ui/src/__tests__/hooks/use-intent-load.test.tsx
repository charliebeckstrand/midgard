import { act, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useIntentLoad } from '../../hooks/use-intent-load'
import { renderUI, screen } from '../helpers'

/**
 * Stubs `requestIdleCallback` so that no idle callback runs. Each test then
 * controls when the load resolves.
 */
function holdIdle() {
	vi.stubGlobal(
		'requestIdleCallback',
		vi.fn(() => 1),
	)

	vi.stubGlobal('cancelIdleCallback', vi.fn())
}

/**
 * A trigger that shows the loaded value when it is open. `seen` records the
 * value that the render had when the open state went true.
 */
function Probe({
	load,
	seen,
}: {
	load: () => Promise<string>
	seen: (value: string | undefined) => void
}) {
	const [open, setOpen] = useState(false)

	const { module, request, preload } = useIntentLoad(load)

	if (open) seen(module)

	return (
		<>
			<button type="button" onFocus={preload} onClick={() => request(() => setOpen(true))}>
				Open
			</button>
			<p>{open ? `open ${module}` : (module ?? 'idle')}</p>
		</>
	)
}

describe('useIntentLoad', () => {
	it('loads on a request, and puts the value into state before the callback', async () => {
		holdIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		const seen = vi.fn()

		renderUI(<Probe load={load} seen={seen} />)

		expect(load).not.toHaveBeenCalled()

		await act(async () => fireEvent.click(screen.getByRole('button')))

		expect(load).toHaveBeenCalledTimes(1)

		expect(screen.getByText('open loaded')).toBeInTheDocument()

		expect(seen).toHaveBeenCalledWith('loaded')

		expect(seen).not.toHaveBeenCalledWith(undefined)
	})

	it('runs the callback in the same call when the value is there', async () => {
		holdIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		const ran: boolean[] = []

		function Sync() {
			const { request } = useIntentLoad(load)

			const press = () => {
				let called = false

				request(() => {
					called = true
				})

				ran.push(called)
			}

			return (
				<button type="button" onClick={press}>
					Press
				</button>
			)
		}

		renderUI(<Sync />)

		await act(async () => fireEvent.click(screen.getByRole('button')))

		act(() => fireEvent.click(screen.getByRole('button')))

		expect(ran).toEqual([false, true])

		expect(load).toHaveBeenCalledTimes(1)
	})

	it('starts the load on a preload, and gives the value through the idle load', async () => {
		let run = () => {}

		vi.stubGlobal(
			'requestIdleCallback',
			vi.fn((callback: () => void) => {
				run = callback

				return 1
			}),
		)

		vi.stubGlobal('cancelIdleCallback', vi.fn())

		const load = vi.fn(() => Promise.resolve('loaded'))

		renderUI(<Probe load={load} seen={vi.fn()} />)

		act(() => fireEvent.focus(screen.getByRole('button')))

		expect(load).toHaveBeenCalledTimes(1)

		await act(async () => run())

		expect(screen.getByText('loaded')).toBeInTheDocument()
	})
})
