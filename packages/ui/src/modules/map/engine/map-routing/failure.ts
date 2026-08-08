/**
 * The kinds a routing request fails as, the evidence each one carries, and the
 * retry rule over them. One taxonomy serves both clients, so an OSRM failure
 * and a Valhalla failure read the same, and the retry rule has one author
 * rather than one per caller.
 */

/**
 * Why a routing request answered with no leg, and whether to ask again. Each
 * kind carries its own evidence and no other's — only a refused response holds
 * a status, and only a service's own refusal holds a code — so reading `kind`
 * reaches the field that kind holds without a second test.
 *
 * `retryable` says whether the same request could answer differently later: a
 * timeout, a dead network, and a busy or broken service can all clear, while a
 * refused request, an unreadable body, and a pair of points no road joins
 * answer the same way however many times they are asked. It is `false` on
 * `'aborted'`, because the caller ended that request itself; whether to send
 * another one is the caller's own call and not a recovery this field asks for.
 */
export type MapRouteFailure =
	| { kind: 'waypoints' | 'aborted' | 'timeout' | 'network' | 'payload'; retryable: boolean }
	| {
			kind: 'http'
			retryable: boolean
			/** The status the service refused with. */
			status: number
	  }
	| {
			kind: 'no-route'
			retryable: boolean
			/**
			 * The service's own refusal code, where the payload named one — OSRM
			 * answers a pair it cannot join with `'NoRoute'`, and a point off the
			 * network with `'NoSegment'`.
			 */
			code?: string
	  }

/**
 * What stopped a routing request. `'waypoints'` is the caller's own input —
 * under two stops name no leg, and no request leaves. `'aborted'` and
 * `'timeout'` are the two ways a signal ends one, held apart because a caller
 * that cancelled its own request learned nothing about the service.
 * `'network'` is a request that never reached an answer, `'http'` a status the
 * service refused with, and `'payload'` a body that is not a routing answer.
 * `'no-route'` is the service's own answer that no leg joins the waypoints.
 */
export type MapRouteFailureKind = MapRouteFailure['kind']

/** The kinds that carry nothing beyond their own name. @internal */
type PlainKind = Exclude<MapRouteFailureKind, 'http' | 'no-route'>

/** The kinds a later attempt could answer differently; the other two read their own evidence. @internal */
const RETRYABLE_KIND: ReadonlySet<MapRouteFailureKind> = new Set(['timeout', 'network'])

/**
 * The statuses that name a busy or a slow service rather than a bad request:
 * a timed-out read, a too-early replay, and a rate limit — the demo servers'
 * own answer under load.
 *
 * @internal
 */
const RETRYABLE_STATUS: ReadonlySet<number> = new Set([408, 425, 429])

/** A failure that carries nothing beyond its own kind. @internal */
export function routeFailure(kind: PlainKind): MapRouteFailure {
	return { kind, retryable: RETRYABLE_KIND.has(kind) }
}

/**
 * The failure a refused response carries: its status, and the retry that status
 * allows. A 5xx is the service's own fault and clears on its own, so it retries
 * with {@link RETRYABLE_STATUS}; every other status names a request that will be
 * refused the same way again.
 *
 * @internal
 */
export function httpFailure(status: number): MapRouteFailure {
	return { kind: 'http', status, retryable: status >= 500 || RETRYABLE_STATUS.has(status) }
}

/**
 * The failure a service's own refusal carries, with the code where it named
 * one. A refusal is never retryable: the service read the pair and answered
 * that no leg joins it.
 *
 * @internal
 */
export function noRouteFailure(code?: string): MapRouteFailure {
	return code === undefined
		? { kind: 'no-route', retryable: false }
		: { kind: 'no-route', retryable: false, code }
}

/** The `name` a thrown value carries, or `''` where it carries none. @internal */
function errorName(error: unknown): string {
	return typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
}

/**
 * The failure a thrown request carries. A signal names itself in the reason it
 * aborts with — `AbortSignal.timeout` throws a `TimeoutError` and a caller's own
 * controller an `AbortError`, and `AbortSignal.any` passes on the reason of
 * whichever of the two fired — so the timeout the client set and the abort the
 * caller asked for stay apart. Anything else takes `fallback`: a request that
 * threw reached no answer, while a body that threw is one this reader cannot
 * take.
 *
 * @internal
 */
export function thrownFailure(error: unknown, fallback: 'network' | 'payload'): MapRouteFailure {
	const name = errorName(error)

	if (name === 'TimeoutError') return routeFailure('timeout')

	if (name === 'AbortError') return routeFailure('aborted')

	return routeFailure(fallback)
}
