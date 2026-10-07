import { act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useIdleLoad } from '../../hooks/use-idle-load'
import { renderUI, screen } from '../helpers'

/** Renders the loaded value as text, or `idle` before it resolves. */
function Probe({ load }: { load: (() => Promise<string>) | null }) {
	return <p>{useIdleLoad(load) ?? 'idle'}</p>
}

/**
 * Stubs `requestIdleCallback` and `cancelIdleCallback` on the window. The
 * returned `run` calls the idle callbacks that are scheduled.
 */
function stubIdle() {
	const callbacks = new Map<number, () => void>()

	let next = 1

	const request = vi.fn((callback: () => void) => {
		callbacks.set(next, callback)

		return next++
	})

	const cancel = vi.fn((handle: number) => {
		callbacks.delete(handle)
	})

	vi.stubGlobal('requestIdleCallback', request)

	vi.stubGlobal('cancelIdleCallback', cancel)

	const run = () => {
		const due = [...callbacks.values()]

		callbacks.clear()

		for (const callback of due) callback()
	}

	return { request, cancel, run }
}

/**
 * Removes `requestIdleCallback` from the window, as in Safari, and fakes the
 * timeouts. The fake clock fakes only the timeouts, so it does not put an idle
 * callback of its own on the window.
 */
function stubNoIdle() {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

	vi.stubGlobal('requestIdleCallback', undefined)

	vi.stubGlobal('cancelIdleCallback', undefined)
}

describe('useIdleLoad', () => {
	it('loads in an idle callback after the mount, and gives the value', async () => {
		const idle = stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		renderUI(<Probe load={load} />)

		expect(idle.request).toHaveBeenCalledTimes(1)

		expect(load).not.toHaveBeenCalled()

		expect(screen.getByText('idle')).toBeInTheDocument()

		await act(async () => idle.run())

		expect(load).toHaveBeenCalledTimes(1)

		expect(screen.getByText('loaded')).toBeInTheDocument()
	})

	it('loads after 1 s in a browser without requestIdleCallback', async () => {
		stubNoIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		renderUI(<Probe load={load} />)

		await act(() => vi.advanceTimersByTimeAsync(999))

		expect(load).not.toHaveBeenCalled()

		await act(() => vi.advanceTimersByTimeAsync(1))

		expect(load).toHaveBeenCalledTimes(1)

		expect(screen.getByText('loaded')).toBeInTheDocument()
	})

	it('cancels the idle callback when the component unmounts before it runs', () => {
		const idle = stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		const { unmount } = renderUI(<Probe load={load} />)

		const handle = idle.request.mock.results[0]?.value

		unmount()

		expect(idle.cancel).toHaveBeenCalledWith(handle)

		idle.run()

		expect(load).not.toHaveBeenCalled()
	})

	it('cancels the fallback timeout when the component unmounts before it runs', () => {
		stubNoIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		const { unmount } = renderUI(<Probe load={load} />)

		unmount()

		vi.advanceTimersByTime(1000)

		expect(load).not.toHaveBeenCalled()
	})

	it('keeps the callback while another mount of the loader waits', async () => {
		const idle = stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		const first = renderUI(<Probe load={load} />)

		renderUI(<Probe load={load} />)

		first.unmount()

		expect(idle.cancel).not.toHaveBeenCalled()

		await act(async () => idle.run())

		expect(load).toHaveBeenCalledTimes(1)

		expect(screen.getByText('loaded')).toBeInTheDocument()
	})

	it('shares one idle callback and one load among the mounts of a loader', async () => {
		const idle = stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		renderUI(
			<>
				<Probe load={load} />
				<Probe load={load} />
			</>,
		)

		expect(idle.request).toHaveBeenCalledTimes(1)

		await act(async () => idle.run())

		expect(load).toHaveBeenCalledTimes(1)

		expect(screen.getAllByText('loaded')).toHaveLength(2)
	})

	it('gives a resolved value in the first render of a later mount, with no new load', async () => {
		const idle = stubIdle()

		const load = vi.fn(() => Promise.resolve('loaded'))

		const first = renderUI(<Probe load={load} />)

		await act(async () => idle.run())

		first.unmount()

		renderUI(<Probe load={load} />)

		expect(screen.getByText('loaded')).toBeInTheDocument()

		expect(idle.request).toHaveBeenCalledTimes(1)

		expect(load).toHaveBeenCalledTimes(1)
	})

	it('gives no value for a failed load, and a later mount loads again', async () => {
		const idle = stubIdle()

		const load = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue('loaded')

		const first = renderUI(<Probe load={load} />)

		await act(async () => idle.run())

		expect(screen.getByText('idle')).toBeInTheDocument()

		first.unmount()

		renderUI(<Probe load={load} />)

		await act(async () => idle.run())

		expect(load).toHaveBeenCalledTimes(2)

		expect(screen.getByText('loaded')).toBeInTheDocument()
	})

	it('schedules nothing for a null loader', () => {
		const idle = stubIdle()

		renderUI(<Probe load={null} />)

		expect(idle.request).not.toHaveBeenCalled()

		expect(screen.getByText('idle')).toBeInTheDocument()
	})
})
