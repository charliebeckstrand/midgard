// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

/** The answers of `/api/build`, in order. `null` is a network that is down. */
function serve(...answers: (string | null)[]) {
	const fetch = vi.fn(async () => {
		const answer = answers.length > 1 ? answers.shift() : answers[0]

		if (answer === null || answer === undefined) throw new TypeError('Failed to fetch')

		return new Response(answer)
	})

	vi.stubGlobal('fetch', fetch)

	return fetch
}

/**
 * Renders the live refresh and the footer of a page that counts votes. The
 * modules load again for each case, so the build of the document starts
 * unknown and no case finds the new build of another case.
 */
async function open() {
	vi.resetModules()

	const [{ LiveRefresh }, { ElectionsFooter }] = await Promise.all([
		import('shared/refresh'),
		import('../components/elections-footer'),
	])

	render(
		createElement('div', null, [
			createElement(LiveRefresh, { key: 'refresh', live: true }),
			createElement(ElectionsFooter, {
				key: 'footer',
				counting: true,
				updated: '2026-11-05T02:00:00.000Z',
			}),
		]),
	)

	// The read of the build of the document, at the first render.
	await act(() => vi.advanceTimersByTimeAsync(0))
}

const minute = () => act(() => vi.advanceTimersByTimeAsync(60_000))

beforeEach(() => {
	vi.useFakeTimers()

	refresh.mockClear()
})

afterEach(() => {
	cleanup()

	vi.useRealTimers()
})

describe('LiveRefresh', () => {
	it('renders the page again while the server runs the build of the page', async () => {
		const fetch = serve('build-a')

		await open()

		await minute()

		expect(fetch).toHaveBeenLastCalledWith('/api/build', { cache: 'no-store' })

		expect(refresh).toHaveBeenCalledTimes(1)

		expect(screen.queryByText(/New build available/)).toBeNull()
	})

	it('skips a minute that gets no answer, so Next does not reload the page, and goes on after it', async () => {
		serve('build-a', null, 'build-a')

		await open()

		await minute()

		expect(refresh).not.toHaveBeenCalled()

		await minute()

		expect(refresh).toHaveBeenCalledTimes(1)
	})

	it('skips a minute with an error answer', async () => {
		const answers = [new Response('build-a'), new Response('Bad gateway', { status: 502 })]

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => answers.shift() ?? new Response('build-a')),
		)

		await open()

		await minute()

		expect(refresh).not.toHaveBeenCalled()

		await minute()

		expect(refresh).toHaveBeenCalledTimes(1)
	})

	it('stops after a deploy, and the footer shows the new build with a link that reloads the page', async () => {
		const fetch = serve('build-a', 'build-b')

		await open()

		await minute()

		expect(refresh).not.toHaveBeenCalled()

		expect(screen.getByText(/New build available/)).not.toBeNull()

		expect(screen.getByRole('button', { name: 'Refresh' })).not.toBeNull()

		const reads = fetch.mock.calls.length

		await minute()

		// No more reads: the page cannot take the data of the new build.
		expect(fetch).toHaveBeenCalledTimes(reads)
	})

	it('reads nothing while the tab is hidden', async () => {
		const fetch = serve('build-a')

		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

		await open()

		const reads = fetch.mock.calls.length

		await minute()

		expect(fetch).toHaveBeenCalledTimes(reads)

		expect(refresh).not.toHaveBeenCalled()
	})
})
