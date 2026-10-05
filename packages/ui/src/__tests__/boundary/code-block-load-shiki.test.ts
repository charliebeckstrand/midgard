import { describe, expect, it, vi } from 'vitest'
import { FakeShikiWorker, load } from '../mocks/shiki'

/**
 * `code-shiki` keeps one worker and the requests in flight in module scope.
 * Each case therefore needs a module whose state starts empty, and a worker port of its own. Both want `vi.resetModules()` and
 * a mock of its own, which the `unit` project bars: one registry serves every
 * file a worker runs (see `test-isolation-boundary.test.ts`). This suite sits
 * in `boundary/`, which the `integration` project runs on forks, for the reason
 * `map-points-render.test.tsx` states.
 *
 * The `CodeBlock` render cases stay in `components/code-block.test.tsx`. They
 * read the global double and need no registry of their own.
 */

/** The worker port of `CodeBlock`, which each case replaces. */
const PORT = '../../components/code/code-shiki-port'

/**
 * Returns `code-shiki` from a module whose state is empty, with `open` as its
 * worker port.
 *
 * @remarks
 * A registration made before `vi.resetModules()` does not always survive it,
 * so the port is registered after the reset.
 *
 * Each case registers one port, and no hook registers another. Vitest resolves
 * the pending registrations of a path in parallel at the next import, so the
 * registration that resolves last wins. A hook that put the shared double back
 * after each case thus replaced the port of the next case in some runs.
 *
 * Import `code-shiki`, not `code-block`. The reset makes the case import the
 * module again, and the time limit of the case includes that import.
 * `code-block` imports the component graph, and a cold transform cache under
 * the React Compiler made that import take more than 5 seconds. The case then
 * stopped at its time limit, but its body continued and registered a failing
 * double while the next case ran. `code-shiki` imports only the port.
 */
async function coldClient(open: () => Worker | null) {
	vi.resetModules()

	vi.doMock(PORT, () => ({ openShikiWorker: open }))

	return import('../../components/code/code-shiki')
}

/**
 * A port that gives `workers` in order, and then a new fake for each call. A
 * `null` stands for an environment with no `Worker`.
 */
function portOf(...workers: (FakeShikiWorker | null)[]) {
	return vi.fn((): Worker | null => {
		const next = workers.length > 0 ? workers.shift() : new FakeShikiWorker()

		return next ? (next as unknown as Worker) : null
	})
}

describe('loadShiki', () => {
	it('sends a warm-up for the defaults of CodeBlock, and opens one worker', async ({ signal }) => {
		const worker = new FakeShikiWorker()

		const post = vi.spyOn(worker, 'postMessage')

		const open = portOf(worker)

		const { loadShiki } = await coldClient(open)

		signal.throwIfAborted()

		await expect(loadShiki()).resolves.toBeUndefined()

		await expect(loadShiki('ts')).resolves.toBeUndefined()

		expect(post.mock.calls.map(([request]) => request)).toEqual([
			{ id: expect.any(Number), lang: 'tsx', theme: 'github-dark-default' },
			{ id: expect.any(Number), lang: 'ts', theme: 'github-dark-default' },
		])

		expect(open).toHaveBeenCalledOnce()
	})

	it('loads again on a later call after a rejected warm-up', async ({ signal }) => {
		const { loadShiki } = await coldClient(portOf())

		signal.throwIfAborted()

		// The worker fails to fetch the grammar chunk once: an offline fetch, or a
		// 404 after a deploy.
		load.mockRejectedValueOnce(new Error('chunk fetch failed'))

		const rejected = loadShiki()

		await expect(rejected).rejects.toThrow('chunk fetch failed')

		signal.throwIfAborted()

		await expect(loadShiki()).resolves.toBeUndefined()
	})

	it('rejects where the environment has no Worker, and retries later', async ({ signal }) => {
		const { loadShiki } = await coldClient(portOf(null))

		signal.throwIfAborted()

		const rejected = loadShiki()

		await expect(rejected).rejects.toThrow('this environment has none')

		signal.throwIfAborted()

		await expect(loadShiki()).resolves.toBeUndefined()
	})
})

describe('highlightCode', () => {
	it('fails each request in flight when the worker fails, and opens a new worker', async ({
		signal,
	}) => {
		const failing = new FakeShikiWorker()

		// The worker never answers, as a worker whose chunk does not load.
		vi.spyOn(failing, 'postMessage').mockImplementation(() => {})

		const open = portOf(failing)

		const { highlightCode, loadShiki } = await coldClient(open)

		signal.throwIfAborted()

		// The failing worker answers no request, so this warm-up settles only when
		// the worker fails.
		const warmup = loadShiki()

		const inFlight = highlightCode('const a = 1', 'tsx', 'github-dark-default')

		const event = failing.crash('chunk 404')

		// The client handles the error, so the page does not report it again.
		expect(event.defaultPrevented).toBe(true)

		expect(failing.terminated).toBe(true)

		await expect(inFlight).rejects.toThrow('the Shiki worker failed: chunk 404')

		await expect(warmup).rejects.toThrow('the Shiki worker failed: chunk 404')

		signal.throwIfAborted()

		await expect(highlightCode('const a = 1', 'tsx', 'github-dark-default')).resolves.toContain(
			'<pre class="shiki"',
		)

		expect(open).toHaveBeenCalledTimes(2)
	})

	it('fails each request in flight when the worker sends no reply in time, and opens a new worker', async ({
		signal,
	}) => {
		const stuck = new FakeShikiWorker()

		// The worker never answers, as a worker in a tokenization that does not stop.
		vi.spyOn(stuck, 'postMessage').mockImplementation(() => {})

		const open = portOf(stuck)

		const { highlightCode, loadShiki } = await coldClient(open)

		signal.throwIfAborted()

		vi.useFakeTimers()

		const warmup = expect(loadShiki()).rejects.toThrow('the Shiki worker sent no reply')

		const inFlight = expect(
			highlightCode('const a = 1', 'tsx', 'github-dark-default'),
		).rejects.toThrow('the Shiki worker sent no reply')

		// Only the client starts a timer in this case.
		await vi.runOnlyPendingTimersAsync()

		expect(stuck.terminated).toBe(true)

		await inFlight

		await warmup

		signal.throwIfAborted()

		await expect(highlightCode('const a = 1', 'tsx', 'github-dark-default')).resolves.toContain(
			'<pre class="shiki"',
		)

		expect(open).toHaveBeenCalledTimes(2)

		// A reply stops the timer of its request.
		expect(vi.getTimerCount()).toBe(0)
	})
})
