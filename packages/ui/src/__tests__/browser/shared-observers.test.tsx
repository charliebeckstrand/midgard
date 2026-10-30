import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { act, renderUI, screen, waitFor } from '../helpers'
import { holdDir } from './helpers/root-state'

/**
 * Counts each `MutationObserver` that observes the `dir` attribute. The count
 * is the measure of the shared observer: one for the page, not one for each
 * reader. The spies call through, and the config restores them after the case.
 */
function watchDirObservers() {
	const observe = vi.spyOn(MutationObserver.prototype, 'observe')

	const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')

	/** Each `observe` call on `dir`, with its observer and its place in the call order. */
	const watches = () =>
		observe.mock.invocationCallOrder.flatMap((order, index) =>
			observe.mock.calls[index]?.[1]?.attributeFilter?.includes('dir')
				? [{ observer: observe.mock.contexts[index], order }]
				: [],
		)

	/** Whether `observer` disconnected after the call at `order`. */
	const disconnectedAfter = (observer: unknown, order: number) =>
		disconnect.mock.invocationCallOrder.some(
			(at, index) => at > order && disconnect.mock.contexts[index] === observer,
		)

	return {
		made: () => watches().length,
		live: () =>
			new Set(
				watches()
					.filter(({ observer, order }) => !disconnectedAfter(observer, order))
					.map(({ observer }) => observer),
			),
	}
}

function Reader({ id }: { id: number }) {
	return <span data-testid={`reader-${id}`}>{useIsRtl() ? 'rtl' : 'ltr'}</span>
}

const READERS = [1, 2, 3, 4, 5]

/** Five readers of the direction, as on a page with several RTL-aware parts. */
function Readers() {
	return READERS.map((id) => <Reader key={id} id={id} />)
}

describe('the shared direction observer (real browser)', () => {
	let watched: ReturnType<typeof watchDirObservers>

	beforeEach(() => {
		watched = watchDirObservers()
	})

	it('observes the document once for every reader', () => {
		renderUI(<Readers />)

		expect(watched.made()).toBe(1)
	})

	it('updates every reader when the root direction changes', async () => {
		renderUI(<Readers />)

		act(() => holdDir('rtl'))

		await waitFor(() => {
			for (const id of READERS) expect(screen.getByTestId(`reader-${id}`).textContent).toBe('rtl')
		})
	})

	it('disconnects when the last reader unmounts', () => {
		const { unmount } = renderUI(<Readers />)

		expect(watched.live().size).toBe(1)

		unmount()

		expect(watched.live().size).toBe(0)
	})
})
