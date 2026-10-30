import { act, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useIntentLoad } from '../../hooks/use-intent-load'
import { renderUI, screen } from '../helpers'
import { stubIdle } from '../helpers/stub-idle'

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
		stubIdle()

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
		stubIdle()

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
		const idle = stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		renderUI(<Probe load={load} seen={vi.fn()} />)

		act(() => fireEvent.focus(screen.getByRole('button')))

		expect(load).toHaveBeenCalledTimes(1)

		await act(async () => idle.run())

		expect(screen.getByText('loaded')).toBeInTheDocument()
	})

	it('gives a value that one mount requested to each mount of the loader', async () => {
		stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		function Reader() {
			return <output>{useIntentLoad(load).module ?? 'idle'}</output>
		}

		renderUI(
			<>
				<Probe load={load} seen={vi.fn()} />
				<Reader />
			</>,
		)

		await act(async () => fireEvent.click(screen.getByRole('button')))

		expect(screen.getByRole('status')).toHaveTextContent('loaded')

		expect(load).toHaveBeenCalledTimes(1)
	})

	it('gives a failed load to the onError of the request, and does not run the callback', async () => {
		stubIdle()

		const error = new Error('the chunk did not load')

		const load = vi.fn(() => Promise.reject(error))

		const then = vi.fn()

		const onError = vi.fn()

		function Failing() {
			const { request } = useIntentLoad(load)

			return (
				<button type="button" onClick={() => request(then, onError)}>
					Press
				</button>
			)
		}

		renderUI(<Failing />)

		await act(async () => fireEvent.click(screen.getByRole('button')))

		expect(onError).toHaveBeenCalledWith(error)

		expect(then).not.toHaveBeenCalled()
	})
})
