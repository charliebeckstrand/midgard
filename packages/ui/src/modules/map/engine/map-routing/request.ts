/**
 * What both routing clients hand `fetch`. That is the travel profile they
 * share, and the abort signal that combines a caller's own with an optional
 * timeout. It also holds the send that turns a response into an answer.
 */

import { httpFailure, thrownFailure } from './failure'
import { type MapRouteAnswer, type OsrmPayload, routeAnswer } from './result'

/** The travel profile a routing request asks for. @internal */
export type Profile = 'driving' | 'walking' | 'cycling'

/**
 * The signal to hand `fetch`: the caller's, a fresh timeout, or both combined
 * through {@link anySignal}. `AbortSignal.timeout(undefined)` throws, so a
 * timeout signal is built only when `timeoutMs` is given. A fired timeout
 * rejects the fetch, which {@link routeFetch} reads back as its own failure kind.
 *
 * @internal
 */
export function requestSignal(
	signal: AbortSignal | undefined,
	timeoutMs: number | undefined,
): AbortSignal | undefined {
	if (timeoutMs === undefined) return signal

	const timeout = AbortSignal.timeout(timeoutMs)

	return signal === undefined ? timeout : anySignal([signal, timeout])
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
 * Send one routing request and read what comes back. Both clients meet here, so
 * the three ways a request fails before its payload are told apart once rather
 * than once per service. Those are a request that never answered, a status the
 * service refused with, and a body that does not parse. Each client keeps only
 * the url and the body its own service takes.
 *
 * @param url - The service endpoint, with whatever the request rides in its path.
 * @param init - The method, headers, body, and signal for this service.
 * @returns The routed leg, or the failure that stopped it.
 *
 * @internal
 */
export async function routeFetch(url: string, init: RequestInit): Promise<MapRouteAnswer> {
	let response: Response

	try {
		response = await fetch(url, init)
	} catch (error) {
		return { ok: false, failure: thrownFailure(error, 'network') }
	}

	if (!response.ok) return { ok: false, failure: httpFailure(response.status) }

	let payload: OsrmPayload

	try {
		payload = (await response.json()) as OsrmPayload
	} catch (error) {
		// A body can abort mid-read as well as fail to parse, so the thrown reason
		// decides here too; only what names neither reads as an unusable payload.
		return { ok: false, failure: thrownFailure(error, 'payload') }
	}

	return routeAnswer(payload)
}
