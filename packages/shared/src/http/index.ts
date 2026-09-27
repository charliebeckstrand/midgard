/**
 * The same-origin request helpers that the apps and the auth pages share.
 * Each request goes to a same-origin path, which a route or the gateway serves
 * (CONVENTIONS §6.3).
 */

/** The body of a refused request. Each server names its reason with one of these keys. */
type ErrorBody = {
	/** The gateway's message, such as "Sign in again to change how you sign in". */
	message?: unknown
	/** A route's list of reasons, such as the problems in a body that it rejects. */
	issues?: unknown
	/** The auth proxy's reason. */
	error?: unknown
}

/**
 * Reads the reason that a refused request gives, for a message that the reader
 * can act on.
 *
 * @remarks
 * It reads the gateway's `message`, then a route's `issues`, then the auth
 * proxy's `error`. It never throws: a body that is not JSON, or that gives no
 * reason, gives `fallback`.
 *
 * @param response - The refused response.
 * @param fallback - The message when the body gives no reason.
 * @returns The reason that the body gives, or `fallback`.
 */
export async function readError(response: Response, fallback: string): Promise<string> {
	const body = (await response.json().catch(() => null)) as ErrorBody | null

	if (typeof body?.message === 'string' && body.message) return body.message

	if (Array.isArray(body?.issues) && body.issues.length > 0)
		return body.issues.map(String).join(' ')

	if (typeof body?.error === 'string' && body.error) return body.error

	return fallback
}

/**
 * Sends `body` as JSON to a same-origin path with `POST`.
 *
 * @param path - The same-origin path.
 * @param body - The value to send as JSON.
 * @param init - More options for the request, such as a `signal`. Its method,
 *   headers, and body are replaced.
 * @returns The response, which the caller checks.
 */
export function postJson(path: string, body: unknown, init?: RequestInit): Promise<Response> {
	return fetch(path, {
		...init,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

/** Options for {@link createRequest}. */
export type RequestOptions = {
	/**
	 * Sends the request. Give `fetchWithSecondStep` from `shared/auth` for a
	 * path that can ask for the second step.
	 *
	 * @defaultValue `fetch`
	 */
	fetch?: (input: string, init?: RequestInit) => Promise<Response>
	/** Runs on a `401`, before the request throws, such as to go to `/login`. */
	onUnauthorized?: () => void
}

/** The checked requests that {@link createRequest} returns. */
export type Requests = {
	/** Sends one request and gives the response. It throws on a status that is not OK. */
	request: (path: string, init?: RequestInit) => Promise<Response>
	/** Sends one request and reads the JSON body. It throws on a status that is not OK. */
	json: <T>(path: string, init?: RequestInit) => Promise<T>
	/** Sends `body` as JSON with `method` and reads the JSON body. It throws on a status that is not OK. */
	send: <T>(path: string, method: string, body: unknown) => Promise<T>
}

/**
 * Makes the checked requests of one API module.
 *
 * @remarks
 * A query or a mutation reads a thrown error as a failure, and a response that
 * is not OK does not throw by itself. So each request checks the status once,
 * here. The error holds the reason that {@link readError} reads, so that a page
 * can show it.
 *
 * @param options - How to send a request, and what to do on a `401`.
 * @returns The checked requests.
 */
export function createRequest({
	fetch: send = fetch,
	onUnauthorized,
}: RequestOptions = {}): Requests {
	async function request(path: string, init?: RequestInit): Promise<Response> {
		const response = await send(path, init)

		if (response.ok) return response

		if (response.status === 401) onUnauthorized?.()

		throw new Error(
			await readError(response, `${init?.method ?? 'GET'} ${path} failed: ${response.status}`),
		)
	}

	async function json<T>(path: string, init?: RequestInit): Promise<T> {
		return (await (await request(path, init)).json()) as T
	}

	function sendJson<T>(path: string, method: string, body: unknown): Promise<T> {
		return json<T>(path, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
	}

	return { request, json, send: sendJson }
}
