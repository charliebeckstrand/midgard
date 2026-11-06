/**
 * What the routing client hands `fetch`. That is the travel profile, and the
 * abort signal that combines a caller's own with an optional timeout. It also
 * holds the send that turns a response into an answer.
 */

import { thrownFailure } from './failure'
import { type MapRouteAnswer, type OsrmPayload, refusedFailure, routeAnswer } from './result'

/** The travel profile a routing request asks for. @internal */
export type MapRouteProfile = 'driving' | 'walking' | 'cycling'

/**
 * The signal a request rides, with the timeout inside it kept apart. A thrown
 * request reads which of the two ended it from these, since the thrown value
 * cannot say.
 *
 * @internal
 */
export type RequestSignal = {
	/** What `fetch` takes: the caller's signal, the timeout, or both combined. */
	signal: AbortSignal | undefined
	/** The timeout the client set, where it set one. */
	timeout: AbortSignal | undefined
}

/**
 * The signal to hand `fetch`: the caller's, a fresh timeout, or both combined
 * through {@link anySignal}. `AbortSignal.timeout` throws on a value that is not
 * a finite count of zero or more, so a timeout signal is built only for such a
 * `timeoutMs`; any other value sets no limit. A fired timeout rejects the
 * fetch, which {@link routeFetch} reads back as its own failure kind.
 *
 * @internal
 */
export function requestSignal(
	signal: AbortSignal | undefined,
	timeoutMs: number | undefined,
): RequestSignal {
	if (timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs < 0) {
		return { signal, timeout: undefined }
	}

	const timeout = AbortSignal.timeout(timeoutMs)

	return { signal: signal === undefined ? timeout : anySignal([signal, timeout]), timeout }
}

/**
 * A signal that aborts when the first of `signals` aborts, with that signal's
 * reason. It does the work of `AbortSignal.any`, which the `.browserslistrc`
 * floor does not cover. Each listener is bound to the combined signal, so the
 * first abort removes all of them.
 *
 * @internal
 */
function anySignal(signals: readonly AbortSignal[]): AbortSignal {
	const controller = new AbortController()

	for (const source of signals) {
		if (source.aborted) {
			controller.abort(source.reason)

			break
		}

		source.addEventListener('abort', () => controller.abort(source.reason), {
			signal: controller.signal,
		})
	}

	return controller.signal
}

/**
 * Send one routing request and read what comes back. It tells apart the three
 * ways a request fails before its payload: a request that never answered, a
 * status the service refused with, and a body that does not parse. A refused
 * response can still carry the service's own refusal in its body (OSRM answers
 * `'NoRoute'` and `'NoSegment'` under a 400), so its body is read too. The
 * client keeps only the url its service takes.
 *
 * @param url - The service endpoint, with whatever the request rides in its path.
 * @param request - The signal to send with, and the timeout inside it.
 * @returns The routed leg, or the failure that stopped it.
 *
 * @internal
 */
export async function routeFetch(
	url: string,
	{ signal, timeout }: RequestSignal,
): Promise<MapRouteAnswer> {
	let response: Response

	try {
		response = await fetch(url, { signal })
	} catch {
		return { ok: false, failure: thrownFailure('network', signal, timeout) }
	}

	if (!response.ok) {
		// A body that does not arrive or does not parse leaves the status as the
		// only evidence of the refusal.
		const body: unknown = await response.json().catch(() => undefined)

		return { ok: false, failure: refusedFailure(response.status, body) }
	}

	let payload: OsrmPayload

	try {
		payload = (await response.json()) as OsrmPayload
	} catch {
		// A body can abort mid-read as well as fail to parse, so the signal decides
		// here too; only what neither signal ended reads as an unusable payload.
		return { ok: false, failure: thrownFailure('payload', signal, timeout) }
	}

	return routeAnswer(payload)
}
