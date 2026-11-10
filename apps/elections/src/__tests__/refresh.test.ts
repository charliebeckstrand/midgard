// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

/** The answers of `/api/build`, in order; the last one repeats. `null` is a network that is down. */
function serve(...answers: (string | number | null)[]) {
	const fetch = vi.fn(async () => {
		const answer = answers.length > 1 ? answers.shift() : answers[0]

		if (answer === null || answer === undefined) throw new TypeError('Failed to fetch')

		// A number is the status of an error answer, such as a 502 during a deploy.
		if (typeof answer === 'number') return new Response('Bad gateway', { status: answer })

		return new Response(answer)
	})

	vi.stubGlobal('fetch', fetch)

	return fetch
}

/**
 * Loads the modules again, so the build of the document starts unknown and
 * no case sees the new build of another case.
 */
async function load() {
	vi.resetModules()

	const [{ LiveRefresh }, { ElectionsFooter }] = await Promise.all([
		import('shared/refresh'),
		import('../components/elections-footer'),
	])

	return { LiveRefresh, ElectionsFooter }
}

/** Renders the footer of a page that counts votes, and the first read of the build. */
async function openFooter() {
	const { ElectionsFooter } = await load()

	render(createElement(ElectionsFooter, { counting: true, updated: '2026-11-05T02:00:00.000Z' }))

	await act(() => vi.advanceTimersByTimeAsync(0))
}

const minute = () => act(() => vi.advanceTimersByTimeAsync(60_000))

const press = (name: string) =>
	act(async () => {
		fireEvent.click(screen.getByRole('button', { name }))

		await vi.advanceTimersByTimeAsync(0)
	})

beforeEach(() => {
	vi.useFakeTimers()

	refresh.mockClear()
})

afterEach(() => {
	cleanup()

	vi.useRealTimers()
})

describe('the Refresh button of the footer', () => {
	it('renders the page again in place while the server runs the build of the page', async () => {
		const fetch = serve('build-a')

		await openFooter()

		await press('Refresh')

		expect(fetch).toHaveBeenLastCalledWith('/api/build', { cache: 'no-store' })

		expect(refresh).toHaveBeenCalledTimes(1)
	})

	it('does not refresh by itself', async () => {
		serve('build-a')

		await openFooter()

		await minute()

		await minute()

		expect(refresh).not.toHaveBeenCalled()
	})

	it('keeps the page when the network is down, so Next does not reload it, and says so', async () => {
		serve('build-a', null)

		await openFooter()

		await press('Refresh')

		expect(refresh).not.toHaveBeenCalled()

		expect(screen.getByText(/Could not refresh/)).not.toBeNull()
	})

	it('keeps the page on an error answer', async () => {
		serve('build-a', 502)

		await openFooter()

		await press('Refresh')

		expect(refresh).not.toHaveBeenCalled()
	})

	it('names a new build in place of the refresh, with a link that reloads the page', async () => {
		serve('build-a', 'build-b')

		await openFooter()

		await press('Refresh')

		expect(refresh).not.toHaveBeenCalled()

		expect(screen.getByText(/New build available/)).not.toBeNull()

		// One button is left: the reload of the new build.
		expect(screen.getAllByRole('button', { name: 'Refresh' })).toHaveLength(1)
	})
})

describe('the build watch of the footer', () => {
	it('reads only the build each minute, and names a new build', async () => {
		serve('build-a', 'build-a', 'build-b')

		await openFooter()

		await minute()

		expect(screen.queryByText(/New build available/)).toBeNull()

		await minute()

		expect(screen.getByText(/New build available/)).not.toBeNull()

		expect(refresh).not.toHaveBeenCalled()
	})

	it('reads nothing while the tab is hidden', async () => {
		const fetch = serve('build-a')

		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

		await openFooter()

		const reads = fetch.mock.calls.length

		await minute()

		expect(fetch).toHaveBeenCalledTimes(reads)
	})
})

describe('LiveRefresh', () => {
	it('renders the page again each minute while the server runs the build of the page', async () => {
		serve('build-a')

		const { LiveRefresh } = await load()

		render(createElement(LiveRefresh, { live: true }))

		await minute()

		await minute()

		expect(refresh).toHaveBeenCalledTimes(2)
	})

	it('skips a minute with no answer, and stops after a deploy', async () => {
		// The first read is the build of the document; then a minute with no answer, one in step, and a deploy.
		serve('build-a', null, null, 'build-a', 'build-a', 'build-b')

		const { LiveRefresh } = await load()

		render(createElement(LiveRefresh, { live: true }))

		await act(() => vi.advanceTimersByTimeAsync(0))

		for (let i = 0; i < 5; i++) await minute()

		expect(refresh).toHaveBeenCalledTimes(1)
	})

	it('does not refresh while `live` is off', async () => {
		serve('build-a')

		const { LiveRefresh } = await load()

		render(createElement(LiveRefresh, { live: false }))

		await minute()

		expect(refresh).not.toHaveBeenCalled()
	})
})
