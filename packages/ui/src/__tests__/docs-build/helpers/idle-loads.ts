import type { Page, Request } from 'playwright'

/**
 * The time in ms with no request in flight after which the network of the
 * page is quiet, as the `networkidle` state of Playwright counts it.
 */
const NETWORK_QUIET = 500

/**
 * The longest wait in ms for an idle callback. A page that is busy for longer
 * than this runs the callback at the deadline.
 */
const IDLE_DEADLINE = 2_000

/**
 * Waits until the page starts no more loads in idle time, or until `limit` ms
 * pass.
 *
 * @remarks
 * The docs load some modules in idle time after the hydration, such as the
 * editing layer of an editable grid (`createLazyModule`). A grid that mounted
 * before that load shows the read-only grid, and then mounts again as an
 * editable grid. The `networkidle` state of Playwright is reached one time,
 * before such a load can start on a busy machine. Thus a read after it can see
 * the read-only grid in one run, and the editable grid in the next run.
 *
 * Each round waits for an idle callback of the page, and then for a quiet
 * network. The wait ends after a round that starts no request.
 *
 * @example
 * ```typescript
 * await waitForIdleLoads(tab, { limit: 20_000 })
 * ```
 */
export async function waitForIdleLoads(tab: Page, { limit }: { limit: number }): Promise<void> {
	const end = Date.now() + limit

	const inFlight = new Set<Request>()

	let started = 0

	let quiet: (() => void) | null = null

	let timer: ReturnType<typeof setTimeout> | undefined

	let deadline: ReturnType<typeof setTimeout> | undefined

	const arm = () => {
		clearTimeout(timer)

		if (inFlight.size === 0) timer = setTimeout(() => quiet?.(), NETWORK_QUIET)
	}

	const onRequest = (request: Request) => {
		started++

		inFlight.add(request)

		clearTimeout(timer)
	}

	const onDone = (request: Request) => {
		inFlight.delete(request)

		arm()
	}

	tab.on('request', onRequest)

	tab.on('requestfinished', onDone)

	tab.on('requestfailed', onDone)

	try {
		while (Date.now() < end) {
			const before = started

			await tab.evaluate(
				(deadline) =>
					new Promise<void>((resolve) => {
						requestIdleCallback(() => resolve(), { timeout: deadline })
					}),
				IDLE_DEADLINE,
			)

			// A request that never ends cannot hold the wait past the limit.
			await new Promise<void>((resolve) => {
				quiet = resolve

				arm()

				clearTimeout(deadline)

				deadline = setTimeout(resolve, Math.max(0, end - Date.now()))
			})

			if (started === before) return
		}
	} finally {
		clearTimeout(timer)

		clearTimeout(deadline)

		tab.off('request', onRequest)

		tab.off('requestfinished', onDone)

		tab.off('requestfailed', onDone)
	}
}
