import { beforeEach, onTestFinished } from 'vitest'

/**
 * Fails a test that fetches a URL that is not local, and refuses the request.
 *
 * A request to a server on the network makes the result of a test depend on
 * the network of the machine and on that server. CI reaches a public server,
 * and the cloud refuses it. The same test then runs a different path of the
 * code on each machine, and it passes on both. Each request of a test thus
 * goes to a local URL, or a double answers it.
 *
 * A URL is local when it names no host, as a `data:` or a `blob:` URL does, or
 * when its host is a loopback host. A relative URL resolves against the URL of
 * the document, which is local in jsdom.
 *
 * A test that stubs `fetch` (`vi.stubGlobal('fetch', ...)`) replaces the guard
 * for that test. The restore after the test (`restore-test-state.ts`) puts the
 * guard back.
 *
 * The check runs in `onTestFinished`, as the check of the console guard does
 * (`console-guard.ts`). A test that failed already is not failed again.
 */

/** The hosts that name this machine. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Marks a `fetch` that already carries the guard. */
const GUARDED = Symbol.for('midgard.fetch-guard')

const requests: string[] = []

/** The URL of a request, resolved against the URL of the document. */
function requestUrl(input: RequestInfo | URL): URL {
	const href = input instanceof Request ? input.url : String(input)

	return new URL(href, globalThis.location?.href)
}

/** Whether a URL names no host, or names a loopback host. */
function isLocal({ hostname }: URL): boolean {
	return hostname === '' || LOOPBACK.has(hostname)
}

/** Empties the requests for the test, and checks them when it finishes. */
function guardFetch(): void {
	requests.length = 0

	onTestFinished(({ task }) => {
		const found = requests.splice(0)

		if (found.length === 0 || task.result?.state === 'fail') return

		throw new Error(
			`the test fetched a URL that is not local. Give the request a double, or stub fetch for the test:\n\n${found.join('\n')}`,
		)
	})
}

/**
 * Puts the guard on `fetch` for every test that a setup file serves.
 *
 * Under `isolate: false` a worker runs the setup file again for each test file
 * and keeps `fetch` from the first one. The guard thus goes on `fetch` one
 * time, and only the hook is registered again.
 */
export function installFetchGuard(): void {
	if (!(GUARDED in globalThis.fetch)) {
		const send = globalThis.fetch.bind(globalThis)

		// The guard is async, so a URL that does not parse rejects, as it does
		// in `fetch`.
		globalThis.fetch = Object.assign(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = requestUrl(input)

				if (isLocal(url)) return send(input, init)

				requests.push(url.href)

				throw new TypeError(`fetch guard: refused ${url.href}`)
			},
			{ [GUARDED]: true },
		)
	}

	beforeEach(guardFetch)
}
