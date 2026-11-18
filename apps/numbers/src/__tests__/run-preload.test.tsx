// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunPreloadProvider, useTakePreloaded } from '../components/run-preload'

const prefetch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch }) }))

/** The idle callbacks that wait, by handle. A cancel removes its callback. */
const idle = new Map<number, () => void>()

/** Runs each idle callback that waits, as the browser does in idle time. */
function flushIdle() {
	for (const [handle, call] of idle) {
		idle.delete(handle)

		call()
	}
}

beforeEach(() => {
	let next = 0

	vi.stubGlobal('requestIdleCallback', (call: () => void) => {
		next += 1

		idle.set(next, call)

		return next
	})

	vi.stubGlobal('cancelIdleCallback', (handle: number) => idle.delete(handle))
})

afterEach(() => {
	cleanup()

	idle.clear()

	vi.unstubAllGlobals()

	vi.restoreAllMocks()

	vi.clearAllMocks()
})

/** Renders the provider of a page in `vsCpu` mode, and gives its take. */
function renderProvider(vsCpu: boolean) {
	let take: ReturnType<typeof useTakePreloaded> = () => null

	function Reader() {
		take = useTakePreloaded()

		return null
	}

	const view = render(
		<RunPreloadProvider vsCpu={vsCpu}>
			<Reader />
		</RunPreloadProvider>,
	)

	return { take: (mode: boolean) => take(mode), view }
}

describe('RunPreloadProvider', () => {
	it.each([
		['solo', false, /^\/vs\/([a-z0-9]{6})$/],
		['vs CPU', true, /^\/([a-z0-9]{6})$/],
	])(
		'on a %s page, prefetches the whole page of a new seed in the other mode, in idle time',
		(_, vsCpu, address) => {
			const { take } = renderProvider(vsCpu)

			// The preload waits for idle time, so it does not slow the page.
			expect(prefetch).not.toHaveBeenCalled()

			flushIdle()

			expect(prefetch).toHaveBeenCalledTimes(1)

			const [path, options] = prefetch.mock.calls[0] ?? []

			// The full kind gets the page with its data, as `<Link prefetch>` does.
			expect(options).toEqual({ kind: 'full' })

			const seed = String(path).match(address)?.[1]

			expect(seed).toBeDefined()

			// The switch gets the preloaded seed once, so a second switch does not play it again.
			expect(take(!vsCpu)).toBe(seed)
			expect(take(!vsCpu)).toBeNull()
		},
	)

	it('waits for the load of the page before the preload', () => {
		vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')

		renderProvider(false)

		flushIdle()

		expect(prefetch).not.toHaveBeenCalled()

		window.dispatchEvent(new Event('load'))

		expect(prefetch).not.toHaveBeenCalled()

		flushIdle()

		expect(prefetch).toHaveBeenCalledTimes(1)
	})

	it('preloads no run of the mode of the page', () => {
		const { take } = renderProvider(false)

		expect(take(false)).toBeNull()

		expect(take(true)).not.toBeNull()
	})

	it('cancels the preload and drops the seed when the page hides, so a held route does not keep it', () => {
		const { take, view } = renderProvider(false)

		view.unmount()

		flushIdle()

		expect(prefetch).not.toHaveBeenCalled()

		expect(take(true)).toBeNull()
	})
})
